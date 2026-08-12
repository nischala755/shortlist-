import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { EvidenceValidationError, validateEvidenceInput } from "@/features/candidate-evidence/evidence";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

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

async function findEvidence(organizationId: string, candidateId: string, evidenceId: string) {
  return getPrisma().candidateEvidence.findFirst({ where: { id: evidenceId, organizationId, candidateId }, select: evidenceSelect });
}

export async function GET(request: Request, context: { params: Promise<{ organizationId: string; candidateId: string; evidenceId: string }> }) {
  try {
    const { organizationId, candidateId, evidenceId } = await context.params;
    const access = await authorize(request, organizationId, "candidate:read");
    if (access.response) return access.response;
    const evidence = await findEvidence(organizationId, candidateId, evidenceId);
    if (!evidence) return NextResponse.json({ error: "Candidate evidence not found" }, { status: 404 });
    return NextResponse.json({ evidence });
  } catch (error) {
    logger.error("Candidate evidence detail lookup failed", error);
    return NextResponse.json({ error: "Unable to load candidate evidence" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ organizationId: string; candidateId: string; evidenceId: string }> }) {
  try {
    const { organizationId, candidateId, evidenceId } = await context.params;
    const access = await authorize(request, organizationId, "candidate:manage");
    if (access.response) return access.response;
    const input = validateEvidenceInput(await request.json());
    const prisma = getPrisma();
    const existing = await prisma.candidateEvidence.findFirst({ where: { id: evidenceId, organizationId, candidateId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Candidate evidence not found" }, { status: 404 });
    if (input.jobRequirementId) {
      const requirement = await prisma.jobRequirement.findFirst({
        where: { id: input.jobRequirementId, job: { organizationId, applications: { some: { candidateId } } } },
        select: { id: true },
      });
      if (!requirement) return NextResponse.json({ error: "Job requirement not found" }, { status: 404 });
    }
    const evidence = await prisma.candidateEvidence.update({ where: { id: evidenceId }, data: input, select: evidenceSelect });
    return NextResponse.json({ evidence });
  } catch (error) {
    if (error instanceof EvidenceValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    logger.error("Candidate evidence update failed", error);
    return NextResponse.json({ error: "Unable to update candidate evidence" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ organizationId: string; candidateId: string; evidenceId: string }> }) {
  try {
    const { organizationId, candidateId, evidenceId } = await context.params;
    const access = await authorize(request, organizationId, "candidate:manage");
    if (access.response) return access.response;
    const result = await getPrisma().candidateEvidence.deleteMany({ where: { id: evidenceId, organizationId, candidateId } });
    if (result.count === 0) return NextResponse.json({ error: "Candidate evidence not found" }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error("Candidate evidence deletion failed", error);
    return NextResponse.json({ error: "Unable to delete candidate evidence" }, { status: 500 });
  }
}
