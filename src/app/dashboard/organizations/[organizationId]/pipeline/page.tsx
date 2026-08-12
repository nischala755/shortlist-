import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { LogoutButton } from "@/components/logout-button";
import { PipelineWorkspace } from "@/components/pipeline-workspace";
import { getCurrentUser } from "@/features/auth/session";
import { hasPermission } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";

export default async function PipelinePage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const requestHeaders = await headers();
  const user = await getCurrentUser(new Request(process.env.APP_URL ?? "http://localhost:3000", { headers: requestHeaders }));
  if (!user) redirect("/login");

  const prisma = getPrisma();
  const membership = await prisma.membership.findUnique({ where: { organizationId_userId: { organizationId, userId: user.id } }, select: { role: true, organization: { select: { name: true } } } });
  if (!membership) notFound();
  if (!hasPermission(membership.role, "application:read")) redirect(`/dashboard/organizations/${organizationId}`);

  const [applications, jobs] = await Promise.all([
    prisma.application.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, currentStage: true, createdAt: true, updatedAt: true,
        candidate: { select: { id: true, name: true, email: true } },
        job: { select: { id: true, title: true } },
        stageHistory: { orderBy: { changedAt: "asc" }, select: { id: true, fromStage: true, toStage: true, changedAt: true, changedBy: { select: { email: true } } } },
      },
    }),
    prisma.job.findMany({ where: { organizationId, applications: { some: {} } }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  return <div className="workspace-shell"><aside className="workspace-sidebar"><Brand /><div className="workspace-identity"><span>{membership.organization.name.slice(0, 2).toUpperCase()}</span><div><strong>{membership.organization.name}</strong><small>{membership.role.replaceAll("_", " ").toLowerCase()}</small></div></div><nav aria-label="Workspace navigation"><Link href={`/dashboard/organizations/${organizationId}`}><span aria-hidden="true">J</span>Jobs</Link><Link href={`/dashboard/organizations/${organizationId}/candidates`}><span aria-hidden="true">C</span>Candidates</Link><Link className="active" href={`/dashboard/organizations/${organizationId}/pipeline`}><span aria-hidden="true">P</span>Pipeline</Link><Link href={`/dashboard/organizations/${organizationId}/evidence`}><span aria-hidden="true">E</span>Evidence</Link><Link href={`/dashboard/organizations/${organizationId}/interviews`}><span aria-hidden="true">I</span>Interviews</Link><Link href={`/dashboard/organizations/${organizationId}/assessments`}><span aria-hidden="true">A</span>Assessments</Link><Link href={`/dashboard/organizations/${organizationId}/team`}><span aria-hidden="true">T</span>Team</Link><Link href="/dashboard"><span aria-hidden="true">Back</span>All organizations</Link></nav><p className="workspace-boundary">Every pipeline change is permission-checked and retained in application history.</p></aside><div className="workspace-content"><header className="workspace-header"><div><span className="connection-dot" />Workspace active</div><div><span>{user.email}</span><LogoutButton /></div></header><PipelineWorkspace organizationId={organizationId} organizationName={membership.organization.name} canManage={hasPermission(membership.role, "application:manage")} jobs={jobs} initialApplications={applications.map((application) => ({ ...application, createdAt: application.createdAt.toISOString(), updatedAt: application.updatedAt.toISOString(), stageHistory: application.stageHistory.map((change) => ({ ...change, changedAt: change.changedAt.toISOString() })) }))} /></div></div>;
}
