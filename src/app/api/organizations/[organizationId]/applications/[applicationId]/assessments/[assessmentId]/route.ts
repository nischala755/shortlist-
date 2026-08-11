import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { AssessmentValidationError, validateAssessmentInput, validateAssessmentStatus } from "@/features/coding-assessments/assessment";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const assessmentSelect = {
  id: true, title: true, instructions: true, durationMinutes: true, status: true, createdAt: true, updatedAt: true,
  createdBy: { select: { id: true, email: true } },
  questions: { orderBy: { position: "asc" as const }, select: { id: true, prompt: true, language: true, starterCode: true, points: true, position: true } },
} as const;

async function authorize(request: Request, organizationId: string, permission: "assessment:read" | "assessment:manage") {
  const user = await getCurrentUser(request);
  if (!user) return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  const access = await canAccessOrganization(organizationId, user.id, permission);
  if (!access.membership) return { response: NextResponse.json({ error: "Organization not found" }, { status: 404 }) };
  if (!access.allowed) return { response: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  return { user };
}

async function findAssessment(organizationId: string, applicationId: string, assessmentId: string) {
  return getPrisma().codingAssessment.findFirst({ where: { id: assessmentId, organizationId, applicationId }, select: { id: true, status: true } });
}

export async function GET(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string; assessmentId: string }> }) {
  try {
    const { organizationId, applicationId, assessmentId } = await context.params;
    const access = await authorize(request, organizationId, "assessment:read");
    if (access.response) return access.response;
    const assessment = await getPrisma().codingAssessment.findFirst({ where: { id: assessmentId, organizationId, applicationId }, select: assessmentSelect });
    if (!assessment) return NextResponse.json({ error: "Coding assessment not found" }, { status: 404 });
    return NextResponse.json({ assessment });
  } catch (error) {
    logger.error("Coding assessment lookup failed", error);
    return NextResponse.json({ error: "Unable to load coding assessment" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string; assessmentId: string }> }) {
  try {
    const { organizationId, applicationId, assessmentId } = await context.params;
    const access = await authorize(request, organizationId, "assessment:manage");
    if (access.response) return access.response;
    const existing = await findAssessment(organizationId, applicationId, assessmentId);
    if (!existing) return NextResponse.json({ error: "Coding assessment not found" }, { status: 404 });
    const body = await request.json() as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (body.status !== undefined) {
      const status = validateAssessmentStatus(body.status);
      if (status === "ASSIGNED") {
        const questionCount = await getPrisma().codingQuestion.count({ where: { assessmentId } });
        if (questionCount === 0) return NextResponse.json({ error: "An assessment needs at least one question before assignment" }, { status: 409 });
      }
      data.status = status;
    }
    if (body.title !== undefined || body.instructions !== undefined || body.durationMinutes !== undefined) {
      if (existing.status !== "DRAFT") return NextResponse.json({ error: "Only draft assessments can be edited" }, { status: 409 });
      const input = validateAssessmentInput(body);
      Object.assign(data, input);
    }
    if (Object.keys(data).length === 0) return NextResponse.json({ error: "No assessment changes supplied" }, { status: 400 });
    const assessment = await getPrisma().codingAssessment.update({ where: { id: assessmentId }, data, select: assessmentSelect });
    return NextResponse.json({ assessment });
  } catch (error) {
    if (error instanceof AssessmentValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    logger.error("Coding assessment update failed", error);
    return NextResponse.json({ error: "Unable to update coding assessment" }, { status: 500 });
  }
}
