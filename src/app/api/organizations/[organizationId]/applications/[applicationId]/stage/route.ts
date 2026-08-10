import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { canTransitionApplicationStage, validateApplicationStage, ApplicationValidationError } from "@/features/applications/application";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

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
      const result = await transaction.application.update({ where: { id: applicationId }, data: { currentStage: nextStage }, select: { id: true, currentStage: true, updatedAt: true } });
      await transaction.applicationStageHistory.create({ data: { applicationId, changedById: user.id, fromStage: application.currentStage, toStage: nextStage } });
      return result;
    });
    return NextResponse.json({ application: updated });
  } catch (error) {
    if (error instanceof ApplicationValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    logger.error("Application stage update failed", error);
    return NextResponse.json({ error: "Unable to update application stage" }, { status: 500 });
  }
}
