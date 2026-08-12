import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AnalyticsWorkspace } from "@/components/analytics-workspace";
import { Brand } from "@/components/brand";
import { LogoutButton } from "@/components/logout-button";
import { NotificationCenter } from "@/components/notification-center";
import { getOrganizationAnalytics } from "@/features/analytics/report";
import { getCurrentUser } from "@/features/auth/session";
import { hasPermission } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";

export default async function AnalyticsPage({ params, searchParams }: { params: Promise<{ organizationId: string }>; searchParams: Promise<{ from?: string; to?: string; error?: string }> }) {
  const { organizationId } = await params; const query = await searchParams;
  const user = await getCurrentUser(new Request(process.env.APP_URL ?? "http://localhost:3000", { headers: await headers() })); if (!user) redirect("/login");
  const membership = await getPrisma().membership.findUnique({ where: { organizationId_userId: { organizationId, userId: user.id } }, select: { role: true, organization: { select: { name: true } } } });
  if (!membership) notFound(); if (!hasPermission(membership.role, "analytics:read")) redirect(`/dashboard/organizations/${organizationId}`);
  let report; let rangeError = query.error;
  try { report = await getOrganizationAnalytics(organizationId, query.from ?? null, query.to ?? null); }
  catch (error) { rangeError = error instanceof Error ? error.message : "Invalid analytics date range"; report = await getOrganizationAnalytics(organizationId, null, null); }
  return <div className="workspace-shell"><aside className="workspace-sidebar"><Brand /><div className="workspace-identity"><span>{membership.organization.name.slice(0, 2).toUpperCase()}</span><div><strong>{membership.organization.name}</strong><small>{membership.role.replaceAll("_", " ").toLowerCase()}</small></div></div><nav aria-label="Workspace navigation"><Link href={`/dashboard/organizations/${organizationId}`}><span>J</span>Jobs</Link><Link href={`/dashboard/organizations/${organizationId}/candidates`}><span>C</span>Candidates</Link><Link href={`/dashboard/organizations/${organizationId}/pipeline`}><span>P</span>Pipeline</Link><Link href={`/dashboard/organizations/${organizationId}/evidence`}><span>E</span>Evidence</Link><Link href={`/dashboard/organizations/${organizationId}/interviews`}><span>I</span>Interviews</Link><Link href={`/dashboard/organizations/${organizationId}/assessments`}><span>A</span>Assessments</Link><Link href={`/dashboard/organizations/${organizationId}/offers`}><span>O</span>Offers</Link><Link className="active" href={`/dashboard/organizations/${organizationId}/analytics`}><span>R</span>Analytics</Link><Link href={`/dashboard/organizations/${organizationId}/audit`}><span>L</span>Audit log</Link><Link href={`/dashboard/organizations/${organizationId}/team`}><span>T</span>Team</Link></nav><p className="workspace-boundary">Reports contain organization aggregates only and never automate candidate decisions.</p></aside><div className="workspace-content"><header className="workspace-header"><div><span className="connection-dot" />Workspace active</div><div><NotificationCenter organizationId={organizationId} /><span>{user.email}</span><LogoutButton /></div></header><AnalyticsWorkspace organizationId={organizationId} organizationName={membership.organization.name} report={report} error={rangeError} /></div></div>;
}
