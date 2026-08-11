import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { validateAuditFilter } from "@/features/audit/audit";
import { getPrisma } from "@/lib/db";
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
    let action: string | undefined;
    let entityType: string | undefined;
    let entityId: string | undefined;
    try {
      action = validateAuditFilter(params.get("action"), "Action");
      entityType = validateAuditFilter(params.get("entityType"), "Entity type");
      entityId = validateAuditFilter(params.get("entityId"), "Entity ID");
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid audit filter" }, { status: 400 });
    }
    const auditLogs = await getPrisma().auditLog.findMany({
      where: { organizationId, ...(action ? { action } : {}), ...(entityType ? { entityType } : {}), ...(entityId ? { entityId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, actorId: true, action: true, entityType: true, entityId: true, metadata: true, createdAt: true, actor: { select: { id: true, email: true } } },
    });
    return NextResponse.json({ auditLogs });
  } catch (error) {
    logger.error("Audit log lookup failed", error);
    return NextResponse.json({ error: "Unable to load audit logs" }, { status: 500 });
  }
}
