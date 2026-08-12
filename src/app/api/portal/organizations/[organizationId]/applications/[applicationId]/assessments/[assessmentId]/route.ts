import { NextResponse } from "next/server";
import { CodingSubmissionStatus } from "@/generated/prisma/client";
import { getCandidatePortalContext } from "@/features/candidate-portal/access";
import { SubmissionValidationError, validateSubmissionInput } from "@/features/candidate-portal/submission";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const assessmentSelect = {
  id: true, title: true, instructions: true, durationMinutes: true, status: true,
  questions: { orderBy: { position: "asc" as const }, select: { id: true, prompt: true, language: true, starterCode: true, points: true, position: true } },
} as const;

async function findAssignedAssessment(organizationId: string, applicationId: string, assessmentId: string, candidateId: string) {
  return getPrisma().codingAssessment.findFirst({ where: { id: assessmentId, organizationId, applicationId, status: "ASSIGNED", application: { candidateId } }, select: assessmentSelect });
}

export async function GET(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string; assessmentId: string }> }) {
  try {
    const { organizationId, applicationId, assessmentId } = await context.params;
    const access = await getCandidatePortalContext(request, organizationId);
    if (access.response) return NextResponse.json({ error: access.response }, { status: access.status });
    const assessment = await findAssignedAssessment(organizationId, applicationId, assessmentId, access.candidate.id);
    if (!assessment) return NextResponse.json({ error: "Assigned assessment not found" }, { status: 404 });
    const submission = await getPrisma().codingSubmission.findUnique({ where: { assessmentId }, select: { id: true, status: true, answersJson: true, startedAt: true, submittedAt: true, updatedAt: true } });
    return NextResponse.json({ assessment: submission ? assessment : { ...assessment, questions: [] }, submission, requiresStart: !submission });
  } catch (error) {
    logger.error("Candidate portal assessment lookup failed", error);
    return NextResponse.json({ error: "Unable to load assigned assessment" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string; assessmentId: string }> }) {
  try {
    const { organizationId, applicationId, assessmentId } = await context.params;
    const access = await getCandidatePortalContext(request, organizationId);
    if (access.response) return NextResponse.json({ error: access.response }, { status: access.status });
    const assessment = await findAssignedAssessment(organizationId, applicationId, assessmentId, access.candidate.id);
    if (!assessment) return NextResponse.json({ error: "Assigned assessment not found" }, { status: 404 });
    const input = validateSubmissionInput(await request.json(), assessment.questions.map((question) => question.id));
    const prisma = getPrisma();
    const existing = await prisma.codingSubmission.findUnique({ where: { assessmentId }, select: { id: true, submittedById: true, status: true, startedAt: true } });
    if (existing?.submittedById !== undefined && existing.submittedById !== access.user.id) return NextResponse.json({ error: "Submission owner mismatch" }, { status: 409 });
    if (existing?.status === "SUBMITTED") return NextResponse.json({ error: "This assessment has already been submitted" }, { status: 409 });
    const now = new Date();
    const startedAt = existing?.startedAt ?? now;
    if (input.status === "SUBMITTED" && now.getTime() > startedAt.getTime() + assessment.durationMinutes * 60 * 1000) return NextResponse.json({ error: "Assessment time limit has expired" }, { status: 409 });
    const answersJson = JSON.parse(JSON.stringify(input.answers));
    const submission = await prisma.codingSubmission.upsert({
      where: { assessmentId },
      create: { assessmentId, submittedById: access.user.id, status: input.status as CodingSubmissionStatus, answersJson, startedAt, submittedAt: input.status === "SUBMITTED" ? now : null },
      update: { status: input.status as CodingSubmissionStatus, answersJson, submittedAt: input.status === "SUBMITTED" ? now : null },
      select: { id: true, status: true, answersJson: true, startedAt: true, submittedAt: true, updatedAt: true },
    });
    return NextResponse.json({ submission }, { status: existing ? 200 : 201 });
  } catch (error) {
    if (error instanceof SubmissionValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    logger.error("Candidate portal assessment submission failed", error);
    return NextResponse.json({ error: "Unable to save assessment submission" }, { status: 500 });
  }
}
