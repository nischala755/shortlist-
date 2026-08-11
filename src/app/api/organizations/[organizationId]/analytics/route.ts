import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { countBy, parseAnalyticsDateRange } from "@/features/analytics/analytics";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(request: Request, context: { params: Promise<{ organizationId: string }> }) {
  try {
    const { organizationId } = await context.params;
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const access = await canAccessOrganization(organizationId, user.id, "analytics:read");
    if (!access.membership) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    if (!access.allowed) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    const url = new URL(request.url);
    let range: ReturnType<typeof parseAnalyticsDateRange>;
    try { range = parseAnalyticsDateRange(url.searchParams.get("from"), url.searchParams.get("to")); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid analytics date range" }, { status: 400 }); }
    const createdAt = range.from || range.to ? { createdAt: { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) } } : {};
    const prisma = getPrisma();
    const [jobs, candidates, applications, interviews, offers, resumes, evidence, assessments] = await Promise.all([
      prisma.job.findMany({ where: { organizationId, ...createdAt }, select: { status: true } }),
      prisma.candidate.count({ where: { organizationId, ...createdAt } }),
      prisma.application.findMany({ where: { organizationId, ...createdAt }, select: { currentStage: true } }),
      prisma.interview.findMany({ where: { organizationId, ...createdAt }, select: { status: true } }),
      prisma.offer.findMany({ where: { organizationId, ...createdAt }, select: { status: true } }),
      prisma.resume.count({ where: { organizationId, ...createdAt } }),
      prisma.candidateEvidence.count({ where: { organizationId, ...createdAt } }),
      prisma.codingAssessment.findMany({ where: { organizationId, ...createdAt }, select: { status: true } }),
    ]);
    return NextResponse.json({
      range: { from: range.from?.toISOString() ?? null, to: range.to?.toISOString() ?? null },
      jobs: { total: jobs.length, byStatus: countBy(jobs.map((job) => job.status)) },
      candidates: { total: candidates },
      applications: { total: applications.length, byStage: countBy(applications.map((application) => application.currentStage)) },
      interviews: { total: interviews.length, byStatus: countBy(interviews.map((interview) => interview.status)) },
      offers: { total: offers.length, byStatus: countBy(offers.map((offer) => offer.status)) },
      resumes: { total: resumes },
      evidence: { total: evidence },
      codingAssessments: { total: assessments.length, byStatus: countBy(assessments.map((assessment) => assessment.status)) },
    });
  } catch (error) {
    logger.error("Organization analytics lookup failed", error);
    return NextResponse.json({ error: "Unable to load organization analytics" }, { status: 500 });
  }
}
