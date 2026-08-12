import { validateAuditFilter } from "./audit";
import { getPrisma } from "@/lib/db";

export async function getOrganizationAuditLogs(organizationId: string, filters: { action?: string | null; entityType?: string | null; entityId?: string | null }) {
  const action = validateAuditFilter(filters.action ?? null, "Action");
  const entityType = validateAuditFilter(filters.entityType ?? null, "Entity type");
  const entityId = validateAuditFilter(filters.entityId ?? null, "Entity ID");
  return getPrisma().auditLog.findMany({
    where: { organizationId, ...(action ? { action } : {}), ...(entityType ? { entityType } : {}), ...(entityId ? { entityId } : {}) },
    orderBy: { createdAt: "desc" }, take: 100,
    select: { id: true, actorId: true, action: true, entityType: true, entityId: true, metadata: true, createdAt: true, actor: { select: { id: true, email: true } } },
  });
}

export type OrganizationAuditLog = Awaited<ReturnType<typeof getOrganizationAuditLogs>>[number];
