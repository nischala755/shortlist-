import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { InterviewValidationError, validateInterviewInput } from "@/features/interviews/interview";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { notifyInterviewerScheduled } from "@/features/notifications/notifications";
import { recordAuditLog } from "@/features/audit/audit";

const interviewSelect = {
  id: true, scheduledStart: true, scheduledEnd: true, location: true, meetingUrl: true, status: true, createdAt: true, updatedAt: true,
  interviewer: { select: { id: true, email: true } },
  createdBy: { select: { id: true, email: true } },
} as const;

async function authorize(request: Request, organizationId: string, permission: "interview:read" | "interview:manage") {
  const user = await getCurrentUser(request);
  if (!user) return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  const access = await canAccessOrganization(organizationId, user.id, permission);
  if (!access.membership) return { response: NextResponse.json({ error: "Organization not found" }, { status: 404 }) };
  if (!access.allowed) return { response: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  return { user, role: access.membership.role };
}

export async function GET(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string }> }) {
  try {
    const { organizationId, applicationId } = await context.params;
    const access = await authorize(request, organizationId, "interview:read");
    if (access.response) return access.response;
    const prisma = getPrisma();
    const application = await prisma.application.findFirst({ where: { id: applicationId, organizationId }, select: { id: true } });
    if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    const interviews = await prisma.interview.findMany({
      where: {
        organizationId,
        applicationId,
        ...(access.role === "INTERVIEWER" ? { interviewerId: access.user.id } : {}),
      },
      orderBy: { scheduledStart: "asc" },
      select: interviewSelect,
    });
    return NextResponse.json({ interviews });
  } catch (error) {
    logger.error("Interview list lookup failed", error);
    return NextResponse.json({ error: "Unable to list interviews" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string }> }) {
  try {
    const { organizationId, applicationId } = await context.params;
    const access = await authorize(request, organizationId, "interview:manage");
    if (access.response) return access.response;
    const input = validateInterviewInput(await request.json());
    const prisma = getPrisma();
    const application = await prisma.application.findFirst({ where: { id: applicationId, organizationId }, select: { id: true } });
    if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    const interviewer = await prisma.membership.findUnique({ where: { organizationId_userId: { organizationId, userId: input.interviewerId } }, select: { role: true } });
    if (!interviewer || interviewer.role === "CANDIDATE") return NextResponse.json({ error: "Interviewer is not an authorized organization member" }, { status: 422 });
    const interview = await prisma.interview.create({ data: { organizationId, applicationId, createdById: access.user.id, ...input }, select: interviewSelect });
    try {
      await notifyInterviewerScheduled({ organizationId, interviewerId: input.interviewerId, interviewId: interview.id, scheduledStart: interview.scheduledStart });
    } catch (notificationError) {
      logger.error("Interview notification creation failed", notificationError);
    }
    try {
      await recordAuditLog({ organizationId, actorId: access.user.id, action: "INTERVIEW_SCHEDULED", entityType: "Interview", entityId: interview.id, metadata: { applicationId, interviewerId: input.interviewerId } });
    } catch (auditError) {
      logger.error("Interview audit failed", auditError);
    }
    return NextResponse.json({ interview }, { status: 201 });
  } catch (error) {
    if (error instanceof InterviewValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    logger.error("Interview creation failed", error);
    return NextResponse.json({ error: "Unable to schedule interview" }, { status: 500 });
  }
}
