import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { JobWorkspace } from "@/components/job-workspace";
import { LogoutButton } from "@/components/logout-button";
import { NotificationCenter } from "@/components/notification-center";
import { getCurrentUser } from "@/features/auth/session";
import { hasPermission } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";

export default async function OrganizationWorkspacePage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const requestHeaders = await headers();
  const user = await getCurrentUser(new Request(process.env.APP_URL ?? "http://localhost:3000", { headers: requestHeaders }));
  if (!user) redirect("/login");

  const prisma = getPrisma();
  const membership = await prisma.membership.findUnique({
    where: { organizationId_userId: { organizationId, userId: user.id } },
    select: { role: true, organization: { select: { id: true, name: true } } },
  });
  if (!membership) notFound();
  if (!hasPermission(membership.role, "job:read")) redirect("/dashboard");

  const [jobs, candidateCount, applicationCount, interviewCount] = await Promise.all([
    prisma.job.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        requirements: { orderBy: { createdAt: "asc" }, select: { id: true, title: true, description: true } },
        _count: { select: { applications: true } },
      },
    }),
    prisma.candidate.count({ where: { organizationId } }),
    prisma.application.count({ where: { organizationId } }),
    prisma.interview.count({ where: { organizationId, status: "SCHEDULED" } }),
  ]);

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <Brand />
        <div className="workspace-identity"><span>{membership.organization.name.slice(0, 2).toUpperCase()}</span><div><strong>{membership.organization.name}</strong><small>{membership.role.replaceAll("_", " ").toLowerCase()}</small></div></div>
        <nav aria-label="Workspace navigation"><Link className="active" href={`/dashboard/organizations/${organizationId}`}><span aria-hidden="true">J</span>Jobs</Link><Link href={`/dashboard/organizations/${organizationId}/candidates`}><span aria-hidden="true">C</span>Candidates</Link><Link href={`/dashboard/organizations/${organizationId}/pipeline`}><span aria-hidden="true">P</span>Pipeline</Link><Link href={`/dashboard/organizations/${organizationId}/evidence`}><span aria-hidden="true">E</span>Evidence</Link><Link href={`/dashboard/organizations/${organizationId}/interviews`}><span aria-hidden="true">I</span>Interviews</Link><Link href={`/dashboard/organizations/${organizationId}/assessments`}><span aria-hidden="true">A</span>Assessments</Link><Link href={`/dashboard/organizations/${organizationId}/offers`}><span aria-hidden="true">O</span>Offers</Link><Link href={`/dashboard/organizations/${organizationId}/analytics`}><span aria-hidden="true">R</span>Analytics</Link><Link href={`/dashboard/organizations/${organizationId}/team`}><span aria-hidden="true">T</span>Team</Link><Link href="/dashboard"><span aria-hidden="true">Back</span>All organizations</Link></nav>
        <p className="workspace-boundary">Hiring data in this workspace is isolated from every other organization.</p>
      </aside>
      <div className="workspace-content">
        <header className="workspace-header"><div><span className="connection-dot" />Workspace active</div><div><NotificationCenter organizationId={organizationId} /><span>{user.email}</span><LogoutButton /></div></header>
        <JobWorkspace
          organizationId={organizationId}
          organizationName={membership.organization.name}
          role={membership.role}
          canManage={hasPermission(membership.role, "job:manage")}
          initialJobs={jobs.map((job) => ({ ...job, createdAt: job.createdAt.toISOString(), updatedAt: job.updatedAt.toISOString(), applicationCount: job._count.applications }))}
          summary={{ jobs: jobs.length, candidates: candidateCount, applications: applicationCount, interviews: interviewCount }}
        />
      </div>
    </div>
  );
}
