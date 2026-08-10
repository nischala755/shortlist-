import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import {
  canAccessOrganization,
  getOrganizationForUser,
} from "@/features/organizations/access";
import { logger } from "@/lib/logger";

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
    const access = await canAccessOrganization(organizationId, user.id, "organization:read");

    if (!access.membership) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    if (!access.allowed) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const organization = await getOrganizationForUser(organizationId, user.id);

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({ organization });
  } catch (error) {
    logger.error("Organization lookup failed", error);
    return NextResponse.json({ error: "Unable to load organization" }, { status: 500 });
  }
}
