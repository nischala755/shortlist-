import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { organizationId, applicationId } = await context.params;
    const access = await canAccessOrganization(organizationId, user.id, "application:read");
    if (!access.membership) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    if (!access.allowed) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

    const application = await getPrisma().application.findFirst({
      where: { id: applicationId, organizationId },
      select: {
        id: true,
        currentStage: true,
        createdAt: true,
        updatedAt: true,
        job: { select: { id: true, title: true } },
        candidate: { select: { id: true, name: true, email: true } },
        stageHistory: {
          orderBy: { changedAt: "asc" },
          select: { id: true, fromStage: true, toStage: true, changedAt: true, changedBy: { select: { id: true, email: true } } },
        },
      },
    });
    if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    return NextResponse.json({ application });
  } catch (error) {
    logger.error("Application lookup failed", error);
    return NextResponse.json({ error: "Unable to load application" }, { status: 500 });
  }
}
