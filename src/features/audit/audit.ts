import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export type AuditInput = {
  organizationId: string;
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, string>;
};

export function validateAuditFilter(value: string | null, name: string) {
  if (value !== null && (value.length < 1 || value.length > 100)) throw new Error(`${name} filter is invalid`);
  return value ?? undefined;
}

export async function recordAuditLog(input: AuditInput) {
  return getPrisma().auditLog.create({ data: { ...input, metadata: input.metadata ?? undefined } });
}

export async function recordAuditLogSafely(input: AuditInput) {
  try { return await recordAuditLog(input); }
  catch (error) { logger.error(`Audit persistence failed for ${input.action}`, error); return null; }
}
