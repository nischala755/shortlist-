import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { EvidenceWorkspace } from "@/components/evidence-workspace";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser } from "@/features/auth/session";
import type { ResumeAnalysis } from "@/features/resume-analysis/provider";
import { hasPermission } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";

export default async function EvidencePage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const requestHeaders = await headers();
  const user = await getCurrentUser(new Request(process.env.APP_URL ?? "http://localhost:3000", { headers: requestHeaders }));
  if (!user) redirect("/login");

  const prisma = getPrisma();
  const membership = await prisma.membership.findUnique({ where: { organizationId_userId: { organizationId, userId: user.id } }, select: { role: true, organization: { select: { name: true } } } });
  if (!membership) notFound();
  if (!hasPermission(membership.role, "candidate:read")) redirect(`/dashboard/organizations/${organizationId}`);

  const candidates = await prisma.candidate.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, email: true,
      applications: { orderBy: { createdAt: "desc" }, select: { id: true, job: { select: { id: true, title: true, requirements: { orderBy: { createdAt: "asc" }, select: { id: true, title: true, description: true } } } } } },
      resumes: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, originalName: true, parsedAt: true, analysis: { select: { provider: true, model: true, createdAt: true, analysisJson: true } } } },
      evidence: { orderBy: { createdAt: "desc" }, select: { id: true, title: true, details: true, sourceType: true, sourceReference: true, jobRequirementId: true, createdAt: true, createdBy: { select: { email: true } } } },
    },
  });

  return <div className="workspace-shell"><aside className="workspace-sidebar"><Brand /><div className="workspace-identity"><span>{membership.organization.name.slice(0, 2).toUpperCase()}</span><div><strong>{membership.organization.name}</strong><small>{membership.role.replaceAll("_", " ").toLowerCase()}</small></div></div><nav aria-label="Workspace navigation"><Link href={`/dashboard/organizations/${organizationId}`}><span aria-hidden="true">J</span>Jobs</Link><Link href={`/dashboard/organizations/${organizationId}/candidates`}><span aria-hidden="true">C</span>Candidates</Link><Link href={`/dashboard/organizations/${organizationId}/pipeline`}><span aria-hidden="true">P</span>Pipeline</Link><Link className="active" href={`/dashboard/organizations/${organizationId}/evidence`}><span aria-hidden="true">E</span>Evidence</Link><Link href={`/dashboard/organizations/${organizationId}/interviews`}><span aria-hidden="true">I</span>Interviews</Link><Link href={`/dashboard/organizations/${organizationId}/assessments`}><span aria-hidden="true">A</span>Assessments</Link><Link href={`/dashboard/organizations/${organizationId}/team`}><span aria-hidden="true">T</span>Team</Link><Link href="/dashboard"><span aria-hidden="true">Back</span>All organizations</Link></nav><p className="workspace-boundary">AI analysis is a review aid. Only source-backed evidence recorded by a reviewer counts toward coverage.</p></aside><div className="workspace-content"><header className="workspace-header"><div><span className="connection-dot" />Workspace active</div><div><span>{user.email}</span><LogoutButton /></div></header><EvidenceWorkspace organizationId={organizationId} organizationName={membership.organization.name} canManage={hasPermission(membership.role, "candidate:manage")} initialCandidates={candidates.map((candidate) => ({ ...candidate, resumes: candidate.resumes.map((resume) => ({ ...resume, parsedAt: resume.parsedAt?.toISOString() ?? null, analysis: resume.analysis ? { provider: resume.analysis.provider, model: resume.analysis.model, createdAt: resume.analysis.createdAt.toISOString(), analysis: resume.analysis.analysisJson as ResumeAnalysis } : null })), evidence: candidate.evidence.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })) }))} /></div></div>;
}
