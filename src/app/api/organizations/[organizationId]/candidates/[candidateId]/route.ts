import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { CandidateValidationError, validateCandidateInput } from "@/features/candidates/candidate";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

async function authorizeCandidate(request: Request, organizationId: string, permission: "candidate:read" | "candidate:manage") {
  const user = await getCurrentUser(request);
  if (!user) return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  const access = await canAccessOrganization(organizationId, user.id, permission);
  if (!access.membership) return { response: NextResponse.json({ error: "Organization not found" }, { status: 404 }) };
  if (!access.allowed) return { response: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  return { user };
}

export async function GET(request: Request, context: { params: Promise<{ organizationId: string; candidateId: string }> }) {
  try {
    const { organizationId, candidateId } = await context.params;
    const access = await authorizeCandidate(request, organizationId, "candidate:read");
    if (access.response) return access.response;

    const candidate = await getPrisma().candidate.findFirst({
      where: { id: candidateId, organizationId },
      select: { id: true, name: true, email: true, phone: true, createdAt: true, updatedAt: true },
    });
    if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    return NextResponse.json({ candidate });
  } catch (error) {
    logger.error("Candidate lookup failed", error);
    return NextResponse.json({ error: "Unable to load candidate" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ organizationId: string; candidateId: string }> }) {
  try {
    const { organizationId, candidateId } = await context.params;
    const access = await authorizeCandidate(request, organizationId, "candidate:manage");
    if (access.response) return access.response;

    const input = validateCandidateInput(await request.json());
    const result = await getPrisma().candidate.updateMany({
      where: { id: candidateId, organizationId },
      data: input,
    });
    if (result.count === 0) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

    const candidate = await getPrisma().candidate.findFirst({
      where: { id: candidateId, organizationId },
      select: { id: true, name: true, email: true, phone: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({ candidate });
  } catch (error) {
    if (error instanceof CandidateValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "A candidate with that email already exists" }, { status: 409 });
    }
    logger.error("Candidate update failed", error);
    return NextResponse.json({ error: "Unable to update candidate" }, { status: 500 });
  }
}
