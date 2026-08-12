import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { ScorecardValidationError, validateScorecardInput } from "@/features/interview-scorecards/scorecard";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const scorecardSelect = {
  id: true, criteriaJson: true, overallRating: true, strengths: true, concerns: true, notes: true, createdAt: true, updatedAt: true,
  submittedBy: { select: { id: true, email: true } },
} as const;

async function authorize(request: Request, organizationId: string, permission: "scorecard:read" | "scorecard:manage") {
  const user = await getCurrentUser(request);
  if (!user) return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  const access = await canAccessOrganization(organizationId, user.id, permission);
  if (!access.membership) return { response: NextResponse.json({ error: "Organization not found" }, { status: 404 }) };
  if (!access.allowed) return { response: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  return { user, role: access.membership.role };
}

async function findInterview(organizationId: string, applicationId: string, interviewId: string, assignedInterviewerId?: string) {
  return getPrisma().interview.findFirst({
    where: { id: interviewId, organizationId, applicationId, ...(assignedInterviewerId ? { interviewerId: assignedInterviewerId } : {}) },
    select: { id: true, interviewerId: true, status: true },
  });
}

function canSubmit(userId: string, role: string, interviewerId: string) {
  return role !== "INTERVIEWER" || userId === interviewerId;
}

export async function GET(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string; interviewId: string }> }) {
  try {
    const { organizationId, applicationId, interviewId } = await context.params;
    const access = await authorize(request, organizationId, "scorecard:read");
    if (access.response) return access.response;
    const interview = await findInterview(organizationId, applicationId, interviewId, access.role === "INTERVIEWER" ? access.user.id : undefined);
    if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    const scorecard = await getPrisma().interviewScorecard.findUnique({ where: { interviewId }, select: scorecardSelect });
    if (!scorecard) return NextResponse.json({ error: "Interview scorecard not found" }, { status: 404 });
    return NextResponse.json({ scorecard });
  } catch (error) {
    logger.error("Interview scorecard lookup failed", error);
    return NextResponse.json({ error: "Unable to load interview scorecard" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string; interviewId: string }> }) {
  try {
    const { organizationId, applicationId, interviewId } = await context.params;
    const access = await authorize(request, organizationId, "scorecard:manage");
    if (access.response) return access.response;
    const interview = await findInterview(organizationId, applicationId, interviewId, access.role === "INTERVIEWER" ? access.user.id : undefined);
    if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    if (interview.status === "CANCELLED") return NextResponse.json({ error: "Cancelled interviews cannot receive scorecards" }, { status: 409 });
    if (!canSubmit(access.user.id, access.role, interview.interviewerId)) return NextResponse.json({ error: "Only the assigned interviewer may submit this scorecard" }, { status: 403 });
    const input = validateScorecardInput(await request.json());
    const scorecard = await getPrisma().interviewScorecard.create({ data: { interviewId, submittedById: access.user.id, criteriaJson: input.criteria, overallRating: input.overallRating, strengths: input.strengths, concerns: input.concerns, notes: input.notes }, select: scorecardSelect });
    return NextResponse.json({ scorecard }, { status: 201 });
  } catch (error) {
    if (error instanceof ScorecardValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return NextResponse.json({ error: "This interview already has a scorecard" }, { status: 409 });
    logger.error("Interview scorecard creation failed", error);
    return NextResponse.json({ error: "Unable to submit interview scorecard" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string; interviewId: string }> }) {
  try {
    const { organizationId, applicationId, interviewId } = await context.params;
    const access = await authorize(request, organizationId, "scorecard:manage");
    if (access.response) return access.response;
    const interview = await findInterview(organizationId, applicationId, interviewId, access.role === "INTERVIEWER" ? access.user.id : undefined);
    if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    if (!canSubmit(access.user.id, access.role, interview.interviewerId)) return NextResponse.json({ error: "Only the assigned interviewer may edit this scorecard" }, { status: 403 });
    const input = validateScorecardInput(await request.json());
    const scorecard = await getPrisma().interviewScorecard.update({ where: { interviewId }, data: { criteriaJson: input.criteria, overallRating: input.overallRating, strengths: input.strengths, concerns: input.concerns, notes: input.notes }, select: scorecardSelect });
    return NextResponse.json({ scorecard });
  } catch (error) {
    if (error instanceof ScorecardValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") return NextResponse.json({ error: "Interview scorecard not found" }, { status: 404 });
    logger.error("Interview scorecard update failed", error);
    return NextResponse.json({ error: "Unable to update interview scorecard" }, { status: 500 });
  }
}
