import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { AssessmentValidationError, validateQuestionInput } from "@/features/coding-assessments/assessment";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const questionSelect = { id: true, prompt: true, language: true, starterCode: true, points: true, position: true, createdAt: true, updatedAt: true } as const;

async function authorize(request: Request, organizationId: string) {
  const user = await getCurrentUser(request);
  if (!user) return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  const access = await canAccessOrganization(organizationId, user.id, "assessment:manage");
  if (!access.membership) return { response: NextResponse.json({ error: "Organization not found" }, { status: 404 }) };
  if (!access.allowed) return { response: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  return { user };
}

export async function PATCH(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string; assessmentId: string; questionId: string }> }) {
  try {
    const { organizationId, applicationId, assessmentId, questionId } = await context.params;
    const access = await authorize(request, organizationId);
    if (access.response) return access.response;
    const input = validateQuestionInput(await request.json());
    const prisma = getPrisma();
    const question = await prisma.codingQuestion.findFirst({ where: { id: questionId, assessmentId, assessment: { organizationId, applicationId, status: "DRAFT" } }, select: { id: true } });
    if (!question) return NextResponse.json({ error: "Draft coding question not found" }, { status: 404 });
    const updated = await prisma.codingQuestion.update({ where: { id: questionId }, data: input, select: questionSelect });
    return NextResponse.json({ question: updated });
  } catch (error) {
    if (error instanceof AssessmentValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    logger.error("Coding question update failed", error);
    return NextResponse.json({ error: "Unable to update coding question" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string; assessmentId: string; questionId: string }> }) {
  try {
    const { organizationId, applicationId, assessmentId, questionId } = await context.params;
    const access = await authorize(request, organizationId);
    if (access.response) return access.response;
    const result = await getPrisma().codingQuestion.deleteMany({ where: { id: questionId, assessmentId, assessment: { organizationId, applicationId, status: "DRAFT" } } });
    if (result.count === 0) return NextResponse.json({ error: "Draft coding question not found" }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error("Coding question deletion failed", error);
    return NextResponse.json({ error: "Unable to delete coding question" }, { status: 500 });
  }
}
