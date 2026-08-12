import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import {
  canAccessOrganization,
  listOrganizationMembers,
} from "@/features/organizations/access";
import { logger } from "@/lib/logger";
import { getPrisma } from "@/lib/db";
import { OrganizationValidationError, validateOrganizationRole } from "@/features/organizations/organization";

export async function GET(
  request: Request,
  context: { params: Promise<{ organizationId: string }> },
) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { organizationId } = await context.params;
    const access = await canAccessOrganization(organizationId, user.id, "member:read");

    if (!access.membership) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    if (!access.allowed) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const members = await listOrganizationMembers(organizationId, user.id);

    return NextResponse.json({ members });
  } catch (error) {
    logger.error("Organization member lookup failed", error);
    return NextResponse.json({ error: "Unable to load organization members" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ organizationId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { organizationId } = await context.params;
    const access = await canAccessOrganization(organizationId, user.id, "member:manage");
    if (!access.membership) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    if (!access.allowed) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    const body = await request.json() as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = validateOrganizationRole(body.role);
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) return NextResponse.json({ error: "A valid user email is required" }, { status: 400 });
    const prisma = getPrisma();
    const invitedUser = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, emailVerifiedAt: true } });
    if (!invitedUser || !invitedUser.emailVerifiedAt) return NextResponse.json({ error: "The user must register and verify their email before being added" }, { status: 404 });
    const membership = await prisma.membership.create({ data: { organizationId, userId: invitedUser.id, role }, select: { id: true, role: true, createdAt: true, user: { select: { id: true, email: true } } } });
    return NextResponse.json({ membership }, { status: 201 });
  } catch (error) {
    if (error instanceof OrganizationValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return NextResponse.json({ error: "This user is already an organization member" }, { status: 409 });
    logger.error("Organization member creation failed", error);
    return NextResponse.json({ error: "Unable to add organization member" }, { status: 500 });
  }
}
