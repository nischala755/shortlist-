import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const evidenceSelect = {
  id: true,
  title: true,
  details: true,
  sourceType: true,
  sourceReference: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, email: true } },
} as const;

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
      prisma.candidateEvidence.findMany({
        where: { organizationId, candidateId, jobRequirement: { jobId } },
        orderBy: { createdAt: "asc" },
        select: { ...evidenceSelect, jobRequirementId: true },
      }),
    ]);
    const unlinkedEvidence = await prisma.candidateEvidence.findMany({
      where: { organizationId, candidateId, jobRequirementId: null },
      orderBy: { createdAt: "asc" },
      select: evidenceSelect,
    });
    const evidenceByRequirement = new Map<string, typeof evidence>();
    for (const item of evidence) {
      if (!item.jobRequirementId) continue;
      const current = evidenceByRequirement.get(item.jobRequirementId) ?? [];
      current.push(item);
      evidenceByRequirement.set(item.jobRequirementId, current);
    }

    return NextResponse.json({
      matrix: {
        job,
        candidate,
        requirements: requirements.map((requirement) => ({ ...requirement, evidence: evidenceByRequirement.get(requirement.id) ?? [] })),
        unlinkedEvidence,
      },
    });
  } catch (error) {
    logger.error("Evidence matrix lookup failed", error);
    return NextResponse.json({ error: "Unable to load evidence matrix" }, { status: 500 });
  }
}
