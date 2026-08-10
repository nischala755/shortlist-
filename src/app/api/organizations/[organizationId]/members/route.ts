import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import {
  getOrganizationForUser,
  listOrganizationMembers,
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
    const organization = await getOrganizationForUser(organizationId, user.id);

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const members = await listOrganizationMembers(organizationId, user.id);

    return NextResponse.json({ members });
  } catch (error) {
    logger.error("Organization member lookup failed", error);
    return NextResponse.json({ error: "Unable to load organization members" }, { status: 500 });
  }
}
