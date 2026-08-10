import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import {
  OrganizationValidationError,
  validateOrganizationRole,
} from "@/features/organizations/organization";
import { logger } from "@/lib/logger";
import { getPrisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ organizationId: string; userId: string }> },
) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { organizationId, userId } = await context.params;
    const access = await canAccessOrganization(organizationId, user.id, "member:manage");

    if (!access.membership) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    if (!access.allowed) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const role = validateOrganizationRole(
      typeof body === "object" && body !== null && "role" in body ? body.role : undefined,
    );
    const membership = await getPrisma().membership.updateMany({
      where: { organizationId, userId },
      data: { role },
    });

    if (membership.count === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({ status: "updated", role });
  } catch (error) {
    if (error instanceof OrganizationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    logger.error("Organization role update failed", error);
    return NextResponse.json({ error: "Unable to update member role" }, { status: 500 });
  }
}
