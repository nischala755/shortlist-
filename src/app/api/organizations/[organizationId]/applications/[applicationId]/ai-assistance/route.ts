import { NextResponse } from "next/server";
import { recordAuditLogSafely } from "@/features/audit/audit";
import { getCurrentUser } from "@/features/auth/session";
import {
  assistApplicationWithMistral,
  HiringAssistanceProviderError,
} from "@/features/hiring-assistance/provider";
import { canAccessOrganization } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function POST(
  request: Request,
  context: { params: Promise<{ organizationId: string; applicationId: string }> },
) {
  try {
    const { organizationId, applicationId } = await context.params;
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const access = await canAccessOrganization(
      organizationId,
      user.id,
      "candidate:read",
    );
    if (!access.membership) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }
    if (!access.allowed) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const application = await getPrisma().application.findFirst({
      where: { id: applicationId, organizationId },
      select: {
        id: true,
        job: {
          select: {
            requirements: {
              orderBy: { createdAt: "asc" },
              select: { id: true, title: true, description: true },
            },
          },
        },
        candidate: {
          select: {
            resumes: {
              where: { parsedText: { not: null } },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { parsedText: true },
            },
          },
        },
      },
    });
    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    if (application.job.requirements.length === 0) {
      return NextResponse.json(
        { error: "Add job requirements before requesting assistance" },
        { status: 409 },
      );
    }
    const sourceText = application.candidate.resumes[0]?.parsedText;
    if (!sourceText) {
      return NextResponse.json(
        { error: "Parse a candidate resume before requesting assistance" },
        { status: 409 },
      );
    }

    const result = await assistApplicationWithMistral(
      application.job.requirements,
      sourceText,
    );
    await recordAuditLogSafely({
      organizationId,
      actorId: user.id,
      action: "AI_APPLICATION_ASSISTANCE_REQUESTED",
      entityType: "Application",
      entityId: application.id,
    });
    return NextResponse.json({
      ...result,
      disclaimer:
        "Generated suggestions are unverified review aids and do not create evidence or change a hiring decision.",
    });
  } catch (error) {
    if (error instanceof HiringAssistanceProviderError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    logger.error("Application assistance failed", error);
    return NextResponse.json(
      { error: "Unable to generate application assistance" },
      { status: 500 },
    );
  }
}
