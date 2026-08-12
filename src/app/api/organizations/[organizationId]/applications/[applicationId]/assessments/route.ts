import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { AssessmentValidationError, validateAssessmentInput } from "@/features/coding-assessments/assessment";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const assessmentSelect = {
  id: true, title: true, instructions: true, durationMinutes: true, status: true, createdAt: true, updatedAt: true,
  createdBy: { select: { id: true, email: true } },
  questions: { orderBy: { position: "asc" as const }, select: { id: true, prompt: true, language: true, starterCode: true, points: true, position: true } },
  submission: { select: { id: true, status: true, answersJson: true, startedAt: true, submittedAt: true, updatedAt: true, submittedBy: { select: { id: true, email: true } } } },
} as const;

async function authorize(request: Request, organizationId: string, permission: "assessment:read" | "assessment:manage") {
  const user = await getCurrentUser(request);
  if (!user) return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  const access = await canAccessOrganization(organizationId, user.id, permission);
  if (!access.membership) return { response: NextResponse.json({ error: "Organization not found" }, { status: 404 }) };
  if (!access.allowed) return { response: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  return { user };
}

export async function GET(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string }> }) {
  try {
    const { organizationId, applicationId } = await context.params;
    const access = await authorize(request, organizationId, "assessment:read");
    if (access.response) return access.response;
    const prisma = getPrisma();
    const application = await prisma.application.findFirst({ where: { id: applicationId, organizationId }, select: { id: true } });
    if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    const assessments = await prisma.codingAssessment.findMany({ where: { organizationId, applicationId }, orderBy: { createdAt: "desc" }, select: assessmentSelect });
    return NextResponse.json({ assessments });
  } catch (error) {
    logger.error("Coding assessment list lookup failed", error);
    return NextResponse.json({ error: "Unable to list coding assessments" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string }> }) {
  try {
    const { organizationId, applicationId } = await context.params;
    const access = await authorize(request, organizationId, "assessment:manage");
    if (access.response) return access.response;
    const input = validateAssessmentInput(await request.json());
    const prisma = getPrisma();
    const application = await prisma.application.findFirst({ where: { id: applicationId, organizationId }, select: { id: true } });
    if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    const assessment = await prisma.codingAssessment.create({ data: { organizationId, applicationId, createdById: access.user.id, ...input }, select: assessmentSelect });
    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    if (error instanceof AssessmentValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    logger.error("Coding assessment creation failed", error);
    return NextResponse.json({ error: "Unable to create coding assessment" }, { status: 500 });
  }
}
