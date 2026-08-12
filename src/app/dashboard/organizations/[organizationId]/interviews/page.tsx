import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { InterviewWorkspace } from "@/components/interview-workspace";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser } from "@/features/auth/session";
import type { ScorecardCriterion } from "@/features/interview-scorecards/scorecard";
import { hasPermission } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";

export default async function InterviewsPage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const requestHeaders = await headers();
  const user = await getCurrentUser(new Request(process.env.APP_URL ?? "http://localhost:3000", { headers: requestHeaders }));
  if (!user) redirect("/login");
  const prisma = getPrisma();
  const membership = await prisma.membership.findUnique({ where: { organizationId_userId: { organizationId, userId: user.id } }, select: { role: true, organization: { select: { name: true } } } });
  if (!membership) notFound();
  if (!hasPermission(membership.role, "interview:read")) redirect(`/dashboard/organizations/${organizationId}`);

  const [applications, members] = await Promise.all([
    prisma.application.findMany({
      where: { organizationId, ...(membership.role === "INTERVIEWER" ? { interviews: { some: { interviewerId: user.id } } } : {}) },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, currentStage: true, candidate: { select: { name: true, email: true } }, job: { select: { title: true } },
        interviews: { where: membership.role === "INTERVIEWER" ? { interviewerId: user.id } : undefined, orderBy: { scheduledStart: "desc" }, select: { id: true, scheduledStart: true, scheduledEnd: true, location: true, meetingUrl: true, status: true, interviewer: { select: { id: true, email: true } }, scorecard: { select: { id: true, criteriaJson: true, overallRating: true, strengths: true, concerns: true, notes: true, submittedBy: { select: { email: true } } } } } },
      },
    }),
    prisma.membership.findMany({ where: { organizationId, role: { not: "CANDIDATE" } }, orderBy: { createdAt: "asc" }, select: { role: true, user: { select: { id: true, email: true } } } }),
  ]);

  return <div className="workspace-shell"><aside className="workspace-sidebar"><Brand /><div className="workspace-identity"><span>{membership.organization.name.slice(0, 2).toUpperCase()}</span><div><strong>{membership.organization.name}</strong><small>{membership.role.replaceAll("_", " ").toLowerCase()}</small></div></div><nav aria-label="Workspace navigation"><Link href={`/dashboard/organizations/${organizationId}`}><span aria-hidden="true">J</span>Jobs</Link><Link href={`/dashboard/organizations/${organizationId}/candidates`}><span aria-hidden="true">C</span>Candidates</Link><Link href={`/dashboard/organizations/${organizationId}/pipeline`}><span aria-hidden="true">P</span>Pipeline</Link><Link href={`/dashboard/organizations/${organizationId}/evidence`}><span aria-hidden="true">E</span>Evidence</Link><Link className="active" href={`/dashboard/organizations/${organizationId}/interviews`}><span aria-hidden="true">I</span>Interviews</Link><Link href={`/dashboard/organizations/${organizationId}/assessments`}><span aria-hidden="true">A</span>Assessments</Link><Link href={`/dashboard/organizations/${organizationId}/team`}><span aria-hidden="true">T</span>Team</Link><Link href="/dashboard"><span aria-hidden="true">Back</span>All organizations</Link></nav><p className="workspace-boundary">Interview feedback is structured, attributable, and advisory to the human hiring team.</p></aside><div className="workspace-content"><header className="workspace-header"><div><span className="connection-dot" />Workspace active</div><div><span>{user.email}</span><LogoutButton /></div></header><InterviewWorkspace organizationId={organizationId} organizationName={membership.organization.name} canSchedule={hasPermission(membership.role, "interview:manage")} canScore={hasPermission(membership.role, "scorecard:manage")} members={members} applications={applications.map((application) => ({ ...application, interviews: application.interviews.map((interview) => ({ ...interview, scheduledStart: interview.scheduledStart.toISOString(), scheduledEnd: interview.scheduledEnd.toISOString(), scorecard: interview.scorecard ? { id: interview.scorecard.id, criteria: interview.scorecard.criteriaJson as ScorecardCriterion[], overallRating: interview.scorecard.overallRating, strengths: interview.scorecard.strengths, concerns: interview.scorecard.concerns, notes: interview.scorecard.notes, submittedBy: interview.scorecard.submittedBy } : null })) }))} /></div></div>;
}
