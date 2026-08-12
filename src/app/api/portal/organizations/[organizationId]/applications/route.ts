import { NextResponse } from "next/server";
import { getCandidatePortalContext } from "@/features/candidate-portal/access";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(request: Request, context: { params: Promise<{ organizationId: string }> }) {
  try {
    const { organizationId } = await context.params;
    const access = await getCandidatePortalContext(request, organizationId);
    if (access.response) return NextResponse.json({ error: access.response }, { status: access.status });
    const applications = await getPrisma().application.findMany({
      where: { organizationId, candidateId: access.candidate.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        currentStage: true,
        createdAt: true,
        updatedAt: true,
        job: { select: { id: true, title: true, description: true } },
        codingAssessments: { where: { status: "ASSIGNED" }, orderBy: { createdAt: "desc" }, select: { id: true, title: true, durationMinutes: true, status: true, submission: { select: { status: true, startedAt: true, submittedAt: true } } } },
        offer: { select: { id: true, title: true, status: true, expiresAt: true } },
      },
    });
    return NextResponse.json({ candidate: access.candidate, applications: applications.map((application) => ({ ...application, offer: application.offer?.status === "DRAFT" ? null : application.offer })) });
  } catch (error) {
    logger.error("Candidate portal application lookup failed", error);
    return NextResponse.json({ error: "Unable to load candidate applications" }, { status: 500 });
  }
}
