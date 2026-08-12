import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { InterviewValidationError, validateInterviewInput } from "@/features/interviews/interview";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

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

async function findInterview(organizationId: string, applicationId: string, interviewId: string) {
  return getPrisma().interview.findFirst({ where: { id: interviewId, organizationId, applicationId }, select: { id: true, scheduledStart: true, scheduledEnd: true, location: true, meetingUrl: true, status: true } });
}

export async function GET(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string; interviewId: string }> }) {
  try {
    const { organizationId, applicationId, interviewId } = await context.params;
    const access = await authorize(request, organizationId, "interview:read");
    if (access.response) return access.response;
    const interview = await getPrisma().interview.findFirst({
      where: {
        id: interviewId,
        organizationId,
        applicationId,
        ...(access.role === "INTERVIEWER" ? { interviewerId: access.user.id } : {}),
      },
      select: interviewSelect,
    });
    if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    return NextResponse.json({ interview });
  } catch (error) {
    logger.error("Interview lookup failed", error);
    return NextResponse.json({ error: "Unable to load interview" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string; interviewId: string }> }) {
  try {
    const { organizationId, applicationId, interviewId } = await context.params;
    const access = await authorize(request, organizationId, "interview:manage");
    if (access.response) return access.response;
    const existing = await findInterview(organizationId, applicationId, interviewId);
    if (!existing) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    const input = validateInterviewInput(await request.json(), { allowPast: true });
    const prisma = getPrisma();
    const interviewer = await prisma.membership.findUnique({ where: { organizationId_userId: { organizationId, userId: input.interviewerId } }, select: { role: true } });
    if (!interviewer || interviewer.role === "CANDIDATE") return NextResponse.json({ error: "Interviewer is not an authorized organization member" }, { status: 422 });
    const interview = await prisma.interview.update({ where: { id: interviewId }, data: input, select: interviewSelect });
    return NextResponse.json({ interview });
  } catch (error) {
    if (error instanceof InterviewValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    logger.error("Interview update failed", error);
    return NextResponse.json({ error: "Unable to update interview" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string; interviewId: string }> }) {
  try {
    const { organizationId, applicationId, interviewId } = await context.params;
    const access = await authorize(request, organizationId, "interview:manage");
    if (access.response) return access.response;
    const result = await getPrisma().interview.updateMany({ where: { id: interviewId, organizationId, applicationId }, data: { status: "CANCELLED" } });
    if (result.count === 0) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error("Interview cancellation failed", error);
    return NextResponse.json({ error: "Unable to cancel interview" }, { status: 500 });
  }
}
