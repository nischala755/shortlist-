import { buildAnalyticsInsights, countBy, parseAnalyticsDateRange } from "./analytics";
import { getPrisma } from "@/lib/db";

export async function getOrganizationAnalytics(organizationId: string, fromValue: string | null, toValue: string | null) {
  const range = parseAnalyticsDateRange(fromValue, toValue);
  const createdAt = range.from || range.to ? { createdAt: { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) } } : {};
  const prisma = getPrisma();
  const [jobs, candidates, applications, interviews, offers, resumes, evidence, assessments] = await Promise.all([
    prisma.job.findMany({ where: { organizationId, ...createdAt }, select: { status: true } }),
    prisma.candidate.count({ where: { organizationId, ...createdAt } }),
    prisma.application.findMany({ where: { organizationId, ...createdAt }, select: { currentStage: true, job: { select: { id: true, title: true } } } }),
    prisma.interview.findMany({ where: { organizationId, ...createdAt }, select: { status: true } }),
    prisma.offer.findMany({ where: { organizationId, ...createdAt }, select: { status: true } }),
    prisma.resume.count({ where: { organizationId, ...createdAt } }),
    prisma.candidateEvidence.count({ where: { organizationId, ...createdAt } }),
    prisma.codingAssessment.findMany({ where: { organizationId, ...createdAt }, select: { status: true } }),
  ]);
  const interviewStatuses = countBy(interviews.map((interview) => interview.status));
  const offerStatuses = countBy(offers.map((offer) => offer.status));
  const jobMap = new Map<string, { id: string; title: string; total: number; byStage: Record<string, number> }>();
  for (const application of applications) {
    const item = jobMap.get(application.job.id) ?? { ...application.job, total: 0, byStage: {} };
    item.total += 1; item.byStage[application.currentStage] = (item.byStage[application.currentStage] ?? 0) + 1; jobMap.set(item.id, item);
  }
  return {
    range: { from: range.from?.toISOString() ?? null, to: range.to?.toISOString() ?? null },
    jobs: { total: jobs.length, byStatus: countBy(jobs.map((job) => job.status)) },
    candidates: { total: candidates },
    applications: { total: applications.length, byStage: countBy(applications.map((application) => application.currentStage)) },
    interviews: { total: interviews.length, byStatus: interviewStatuses },
    offers: { total: offers.length, byStatus: offerStatuses },
    resumes: { total: resumes }, evidence: { total: evidence },
    codingAssessments: { total: assessments.length, byStatus: countBy(assessments.map((assessment) => assessment.status)) },
    applicationsByJob: [...jobMap.values()].sort((left, right) => right.total - left.total || left.title.localeCompare(right.title)),
    insights: buildAnalyticsInsights({ candidates, resumes, evidence, interviews: interviewStatuses, offers: offerStatuses }),
  };
}

export type OrganizationAnalytics = Awaited<ReturnType<typeof getOrganizationAnalytics>>;
