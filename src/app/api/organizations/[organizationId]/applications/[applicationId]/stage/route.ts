import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { canTransitionApplicationStage, validateApplicationStage, ApplicationValidationError } from "@/features/applications/application";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { recordAuditLog } from "@/features/audit/audit";

class ApplicationTransitionConflictError extends Error {}

export async function PATCH(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { organizationId, applicationId } = await context.params;
    const access = await canAccessOrganization(organizationId, user.id, "application:manage");
    if (!access.membership) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    if (!access.allowed) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

    const body = await request.json();
    const nextStage = validateApplicationStage(typeof body === "object" && body !== null && "stage" in body ? body.stage : undefined);
    const application = await getPrisma().application.findFirst({ where: { id: applicationId, organizationId }, select: { id: true, currentStage: true } });
    if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    if (!canTransitionApplicationStage(application.currentStage, nextStage)) {
      return NextResponse.json({ error: `Invalid transition from ${application.currentStage} to ${nextStage}` }, { status: 409 });
    }

    const updated = await getPrisma().$transaction(async (transaction) => {
      const result = await transaction.application.updateMany({
        where: { id: applicationId, organizationId, currentStage: application.currentStage },
        data: { currentStage: nextStage },
      });
      if (result.count === 0) throw new ApplicationTransitionConflictError();
      await transaction.applicationStageHistory.create({ data: { applicationId, changedById: user.id, fromStage: application.currentStage, toStage: nextStage } });
      return transaction.application.findUniqueOrThrow({
        where: { id: applicationId },
        select: { id: true, currentStage: true, updatedAt: true },
      });
    });
    try {
      await recordAuditLog({ organizationId, actorId: user.id, action: "APPLICATION_STAGE_CHANGED", entityType: "Application", entityId: applicationId, metadata: { fromStage: application.currentStage, toStage: nextStage } });
    } catch (auditError) {
      logger.error("Application stage audit failed", auditError);
    }
    return NextResponse.json({ application: updated });
  } catch (error) {
    if (error instanceof ApplicationValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof ApplicationTransitionConflictError) return NextResponse.json({ error: "Application stage changed while this request was being processed" }, { status: 409 });
    logger.error("Application stage update failed", error);
    return NextResponse.json({ error: "Unable to update application stage" }, { status: 500 });
  }
}
