import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { CandidateValidationError, validateCandidateInput } from "@/features/candidates/candidate";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(request: Request, context: { params: Promise<{ organizationId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { organizationId } = await context.params;
    const access = await canAccessOrganization(organizationId, user.id, "candidate:read");
    if (!access.membership) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    if (!access.allowed) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

    const query = new URL(request.url).searchParams.get("q")?.trim();
    const candidates = await getPrisma().candidate.findMany({
      where: {
        organizationId,
        ...(query
          ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }] }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, phone: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({ candidates });
  } catch (error) {
    logger.error("Candidate list lookup failed", error);
    return NextResponse.json({ error: "Unable to list candidates" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ organizationId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { organizationId } = await context.params;
    const access = await canAccessOrganization(organizationId, user.id, "candidate:manage");
    if (!access.membership) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    if (!access.allowed) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

    const input = validateCandidateInput(await request.json());
    const candidate = await getPrisma().candidate.create({
      data: { organizationId, createdById: user.id, ...input },
      select: { id: true, name: true, email: true, phone: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({ candidate }, { status: 201 });
  } catch (error) {
    if (error instanceof CandidateValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "A candidate with that email already exists" }, { status: 409 });
    }
    logger.error("Candidate creation failed", error);
    return NextResponse.json({ error: "Unable to create candidate" }, { status: 500 });
  }
}
