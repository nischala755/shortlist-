import { getPrisma } from "@/lib/db";

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
