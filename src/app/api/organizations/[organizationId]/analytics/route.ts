import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { getOrganizationAnalytics } from "@/features/analytics/report";
import { logger } from "@/lib/logger";

export async function GET(request: Request, context: { params: Promise<{ organizationId: string }> }) {
  try {
    const { organizationId } = await context.params;
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const access = await canAccessOrganization(organizationId, user.id, "analytics:read");
    if (!access.membership) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    if (!access.allowed) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    const url = new URL(request.url);
    try { return NextResponse.json(await getOrganizationAnalytics(organizationId, url.searchParams.get("from"), url.searchParams.get("to"))); }
    catch (error) { if (error instanceof Error && error.message.startsWith("Analytics ")) return NextResponse.json({ error: error.message }, { status: 400 }); throw error; }
  } catch (error) {
    logger.error("Organization analytics lookup failed", error);
    return NextResponse.json({ error: "Unable to load organization analytics" }, { status: 500 });
  }
}
