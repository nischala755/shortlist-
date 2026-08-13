import { NextResponse } from "next/server";
import { recordAuditLogSafely } from "@/features/audit/audit";
import { getCurrentUser } from "@/features/auth/session";
import {
  HiringAssistanceProviderError,
  summarizeFeedbackWithMistral,
} from "@/features/hiring-assistance/provider";
import { canAccessOrganization } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      organizationId: string;
      applicationId: string;
      interviewId: string;
    }>;
  },
) {
  try {
    const { organizationId, applicationId, interviewId } = await context.params;
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const access = await canAccessOrganization(
      organizationId,
      user.id,
      "scorecard:read",
    );
    if (!access.membership) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }
    if (!access.allowed) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const scorecard = await getPrisma().interviewScorecard.findFirst({
      where: {
        interviewId,
        interview: {
          organizationId,
          applicationId,
          ...(access.membership.role === "INTERVIEWER"
            ? { interviewerId: user.id }
            : {}),
        },
      },
      select: {
        criteriaJson: true,
        overallRating: true,
        strengths: true,
        concerns: true,
        notes: true,
      },
    });
    if (!scorecard) {
      return NextResponse.json({ error: "Interview scorecard not found" }, { status: 404 });
    }

    const result = await summarizeFeedbackWithMistral(scorecard);
    await recordAuditLogSafely({
      organizationId,
      actorId: user.id,
      action: "AI_FEEDBACK_SUMMARY_REQUESTED",
      entityType: "InterviewScorecard",
      entityId: interviewId,
      metadata: { applicationId },
    });
    return NextResponse.json({
      ...result,
      disclaimer:
        "Generated summary is a review aid based on the human scorecard and is not a hiring recommendation.",
    });
  } catch (error) {
    if (error instanceof HiringAssistanceProviderError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    logger.error("Interview feedback summary failed", error);
    return NextResponse.json(
      { error: "Unable to summarize interview feedback" },
      { status: 500 },
    );
  }
}
