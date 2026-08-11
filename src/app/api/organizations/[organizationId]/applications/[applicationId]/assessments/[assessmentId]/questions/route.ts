import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { AssessmentValidationError, validateQuestionInput } from "@/features/coding-assessments/assessment";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const questionSelect = { id: true, prompt: true, language: true, starterCode: true, points: true, position: true, createdAt: true, updatedAt: true } as const;

async function authorize(request: Request, organizationId: string, permission: "assessment:read" | "assessment:manage") {
  const user = await getCurrentUser(request);
  if (!user) return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  const access = await canAccessOrganization(organizationId, user.id, permission);
  if (!access.membership) return { response: NextResponse.json({ error: "Organization not found" }, { status: 404 }) };
  if (!access.allowed) return { response: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  return { user };
}

export async function GET(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string; assessmentId: string }> }) {
  try {
    const { organizationId, applicationId, assessmentId } = await context.params;
    const access = await authorize(request, organizationId, "assessment:read");
    if (access.response) return access.response;
    const assessment = await getPrisma().codingAssessment.findFirst({ where: { id: assessmentId, organizationId, applicationId }, select: { id: true } });
    if (!assessment) return NextResponse.json({ error: "Coding assessment not found" }, { status: 404 });
    const questions = await getPrisma().codingQuestion.findMany({ where: { assessmentId }, orderBy: { position: "asc" }, select: questionSelect });
    return NextResponse.json({ questions });
  } catch (error) {
    logger.error("Coding question list lookup failed", error);
    return NextResponse.json({ error: "Unable to list coding questions" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string; assessmentId: string }> }) {
  try {
    const { organizationId, applicationId, assessmentId } = await context.params;
    const access = await authorize(request, organizationId, "assessment:manage");
    if (access.response) return access.response;
    const input = validateQuestionInput(await request.json());
    const prisma = getPrisma();
    const assessment = await prisma.codingAssessment.findFirst({ where: { id: assessmentId, organizationId, applicationId }, select: { id: true, status: true } });
    if (!assessment) return NextResponse.json({ error: "Coding assessment not found" }, { status: 404 });
    if (assessment.status !== "DRAFT") return NextResponse.json({ error: "Questions can only be changed on draft assessments" }, { status: 409 });
    const last = await prisma.codingQuestion.findFirst({ where: { assessmentId }, orderBy: { position: "desc" }, select: { position: true } });
    const question = await prisma.codingQuestion.create({ data: { assessmentId, position: (last?.position ?? 0) + 1, ...input }, select: questionSelect });
    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    if (error instanceof AssessmentValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    logger.error("Coding question creation failed", error);
    return NextResponse.json({ error: "Unable to create coding question" }, { status: 500 });
  }
}
