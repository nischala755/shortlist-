import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { getOrganizationAuditLogs } from "@/features/audit/report";
import { logger } from "@/lib/logger";

export async function GET(request: Request, context: { params: Promise<{ organizationId: string }> }) {
  try {
    const { organizationId } = await context.params;
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const access = await canAccessOrganization(organizationId, user.id, "audit:read");
    if (!access.membership) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    if (!access.allowed) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    const params = new URL(request.url).searchParams;
    try {
      const auditLogs = await getOrganizationAuditLogs(organizationId, { action: params.get("action"), entityType: params.get("entityType"), entityId: params.get("entityId") });
      return NextResponse.json({ auditLogs });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid audit filter" }, { status: 400 });
    }
  } catch (error) {
    logger.error("Audit log lookup failed", error);
    return NextResponse.json({ error: "Unable to load audit logs" }, { status: 500 });
  }
}
