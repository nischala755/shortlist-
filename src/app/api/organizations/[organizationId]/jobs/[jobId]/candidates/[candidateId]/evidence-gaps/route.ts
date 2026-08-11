import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { buildEvidenceGapReport } from "@/features/evidence-gaps/gaps";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(
  request: Request,
  context: { params: Promise<{ organizationId: string; jobId: string; candidateId: string }> },
) {
  try {
    const { organizationId, jobId, candidateId } = await context.params;
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const access = await canAccessOrganization(organizationId, user.id, "candidate:read");
    if (!access.membership) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    if (!access.allowed) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

    const prisma = getPrisma();
    const [job, candidate] = await Promise.all([
      prisma.job.findFirst({ where: { id: jobId, organizationId }, select: { id: true, title: true } }),
      prisma.candidate.findFirst({ where: { id: candidateId, organizationId }, select: { id: true, name: true, email: true } }),
    ]);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

    const [requirements, evidence] = await Promise.all([
      prisma.jobRequirement.findMany({ where: { jobId }, orderBy: { createdAt: "asc" }, select: { id: true, title: true, description: true } }),
      prisma.candidateEvidence.findMany({ where: { organizationId, candidateId, jobRequirement: { jobId } }, select: { id: true, jobRequirementId: true } }),
    ]);
    return NextResponse.json({ report: { job, candidate, ...buildEvidenceGapReport(requirements, evidence) } });
  } catch (error) {
    logger.error("Evidence gap lookup failed", error);
    return NextResponse.json({ error: "Unable to load evidence gaps" }, { status: 500 });
  }
}
