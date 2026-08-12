import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { EvidenceValidationError, validateEvidenceInput } from "@/features/candidate-evidence/evidence";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { recordAuditLogSafely } from "@/features/audit/audit";

async function authorize(request: Request, organizationId: string, permission: "candidate:read" | "candidate:manage") {
  const user = await getCurrentUser(request);
  if (!user) return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  const access = await canAccessOrganization(organizationId, user.id, permission);
  if (!access.membership) return { response: NextResponse.json({ error: "Organization not found" }, { status: 404 }) };
  if (!access.allowed) return { response: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  return { user };
}

const evidenceSelect = {
  id: true, title: true, details: true, sourceType: true, sourceReference: true, jobRequirementId: true, createdAt: true, updatedAt: true,
  createdBy: { select: { id: true, email: true } },
  jobRequirement: { select: { id: true, title: true } },
} as const;

export async function GET(request: Request, context: { params: Promise<{ organizationId: string; candidateId: string }> }) {
  try {
    const { organizationId, candidateId } = await context.params;
    const access = await authorize(request, organizationId, "candidate:read");
    if (access.response) return access.response;
    const candidate = await getPrisma().candidate.findFirst({ where: { id: candidateId, organizationId }, select: { id: true } });
    if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    const evidence = await getPrisma().candidateEvidence.findMany({ where: { organizationId, candidateId }, orderBy: { createdAt: "desc" }, select: evidenceSelect });
    return NextResponse.json({ evidence });
  } catch (error) {
    logger.error("Candidate evidence lookup failed", error);
    return NextResponse.json({ error: "Unable to load candidate evidence" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ organizationId: string; candidateId: string }> }) {
  try {
    const { organizationId, candidateId } = await context.params;
    const access = await authorize(request, organizationId, "candidate:manage");
    if (access.response) return access.response;
    const input = validateEvidenceInput(await request.json());
    const prisma = getPrisma();
    const candidate = await prisma.candidate.findFirst({ where: { id: candidateId, organizationId }, select: { id: true } });
    if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    if (input.jobRequirementId) {
      const requirement = await prisma.jobRequirement.findFirst({
        where: { id: input.jobRequirementId, job: { organizationId, applications: { some: { candidateId } } } },
        select: { id: true },
      });
      if (!requirement) return NextResponse.json({ error: "Job requirement not found" }, { status: 404 });
    }
    const evidence = await prisma.candidateEvidence.create({ data: { organizationId, candidateId, createdById: access.user.id, ...input }, select: evidenceSelect });
    await recordAuditLogSafely({ organizationId, actorId: access.user.id, action: "CANDIDATE_EVIDENCE_CREATED", entityType: "CandidateEvidence", entityId: evidence.id, metadata: { candidateId, sourceType: evidence.sourceType } });
    return NextResponse.json({ evidence }, { status: 201 });
  } catch (error) {
    if (error instanceof EvidenceValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    logger.error("Candidate evidence creation failed", error);
    return NextResponse.json({ error: "Unable to create candidate evidence" }, { status: 500 });
  }
}
