import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { CandidateWorkspace } from "@/components/candidate-workspace";
import { LogoutButton } from "@/components/logout-button";
import { NotificationCenter } from "@/components/notification-center";
import { getCurrentUser } from "@/features/auth/session";
import { hasPermission } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";

export default async function CandidateWorkspacePage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const requestHeaders = await headers();
  const user = await getCurrentUser(new Request(process.env.APP_URL ?? "http://localhost:3000", { headers: requestHeaders }));
  if (!user) redirect("/login");

  const prisma = getPrisma();
  const membership = await prisma.membership.findUnique({
    where: { organizationId_userId: { organizationId, userId: user.id } },
    select: { role: true, organization: { select: { name: true } } },
  });
  if (!membership) notFound();
  if (!hasPermission(membership.role, "candidate:read")) redirect(`/dashboard/organizations/${organizationId}`);

  const [candidates, publishedJobs] = await Promise.all([
    prisma.candidate.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        resumes: { orderBy: { createdAt: "desc" }, select: { id: true, originalName: true, mimeType: true, sizeBytes: true, parsedAt: true, createdAt: true } },
        applications: { orderBy: { createdAt: "desc" }, select: { id: true, currentStage: true, createdAt: true, job: { select: { id: true, title: true } } } },
      },
    }),
    prisma.job.findMany({ where: { organizationId, status: "PUBLISHED" }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <Brand />
        <div className="workspace-identity"><span>{membership.organization.name.slice(0, 2).toUpperCase()}</span><div><strong>{membership.organization.name}</strong><small>{membership.role.replaceAll("_", " ").toLowerCase()}</small></div></div>
        <nav aria-label="Workspace navigation"><Link href={`/dashboard/organizations/${organizationId}`}><span aria-hidden="true">J</span>Jobs</Link><Link className="active" href={`/dashboard/organizations/${organizationId}/candidates`}><span aria-hidden="true">C</span>Candidates</Link><Link href={`/dashboard/organizations/${organizationId}/pipeline`}><span aria-hidden="true">P</span>Pipeline</Link><Link href={`/dashboard/organizations/${organizationId}/evidence`}><span aria-hidden="true">E</span>Evidence</Link><Link href={`/dashboard/organizations/${organizationId}/interviews`}><span aria-hidden="true">I</span>Interviews</Link><Link href={`/dashboard/organizations/${organizationId}/assessments`}><span aria-hidden="true">A</span>Assessments</Link><Link href={`/dashboard/organizations/${organizationId}/offers`}><span aria-hidden="true">O</span>Offers</Link><Link href={`/dashboard/organizations/${organizationId}/team`}><span aria-hidden="true">T</span>Team</Link><Link href="/dashboard"><span aria-hidden="true">Back</span>All organizations</Link></nav>
        <p className="workspace-boundary">Candidate records are visible only to authorized members of this organization.</p>
      </aside>
      <div className="workspace-content">
        <header className="workspace-header"><div><span className="connection-dot" />Workspace active</div><div><NotificationCenter organizationId={organizationId} /><span>{user.email}</span><LogoutButton /></div></header>
        <CandidateWorkspace
          organizationId={organizationId}
          organizationName={membership.organization.name}
          canManage={hasPermission(membership.role, "candidate:manage")}
          canCreateApplication={hasPermission(membership.role, "application:manage")}
          publishedJobs={publishedJobs}
          initialCandidates={candidates.map((candidate) => ({
            ...candidate,
            createdAt: candidate.createdAt.toISOString(),
            updatedAt: candidate.updatedAt.toISOString(),
            resumes: candidate.resumes.map((resume) => ({ ...resume, parsedAt: resume.parsedAt?.toISOString() ?? null, createdAt: resume.createdAt.toISOString() })),
            applications: candidate.applications.map((application) => ({ ...application, createdAt: application.createdAt.toISOString() })),
          }))}
        />
      </div>
    </div>
  );
}
