import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { LogoutButton } from "@/components/logout-button";
import { NotificationCenter } from "@/components/notification-center";
import { OfferWorkspace } from "@/components/offer-workspace";
import { getCurrentUser } from "@/features/auth/session";
import { hasPermission } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";

export default async function OffersPage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const user = await getCurrentUser(new Request(process.env.APP_URL ?? "http://localhost:3000", { headers: await headers() }));
  if (!user) redirect("/login");
  const prisma = getPrisma();
  const membership = await prisma.membership.findUnique({ where: { organizationId_userId: { organizationId, userId: user.id } }, select: { role: true, organization: { select: { name: true } } } });
  if (!membership) notFound();
  if (!hasPermission(membership.role, "offer:read")) redirect(`/dashboard/organizations/${organizationId}`);
  const applications = await prisma.application.findMany({
    where: { organizationId, OR: [{ currentStage: "OFFER" }, { offer: { isNot: null } }] },
    orderBy: { updatedAt: "desc" },
    select: { id: true, currentStage: true, candidate: { select: { name: true, email: true } }, job: { select: { title: true } }, offer: { select: { id: true, title: true, details: true, compensationDetails: true, expiresAt: true, status: true, sentAt: true, respondedAt: true, responseNote: true, updatedAt: true, createdBy: { select: { email: true } } } } },
  });
  return <div className="workspace-shell"><aside className="workspace-sidebar"><Brand /><div className="workspace-identity"><span>{membership.organization.name.slice(0, 2).toUpperCase()}</span><div><strong>{membership.organization.name}</strong><small>{membership.role.replaceAll("_", " ").toLowerCase()}</small></div></div><nav aria-label="Workspace navigation"><Link href={`/dashboard/organizations/${organizationId}`}><span>J</span>Jobs</Link><Link href={`/dashboard/organizations/${organizationId}/candidates`}><span>C</span>Candidates</Link><Link href={`/dashboard/organizations/${organizationId}/pipeline`}><span>P</span>Pipeline</Link><Link href={`/dashboard/organizations/${organizationId}/evidence`}><span>E</span>Evidence</Link><Link href={`/dashboard/organizations/${organizationId}/interviews`}><span>I</span>Interviews</Link><Link href={`/dashboard/organizations/${organizationId}/assessments`}><span>A</span>Assessments</Link><Link className="active" href={`/dashboard/organizations/${organizationId}/offers`}><span>O</span>Offers</Link><Link href={`/dashboard/organizations/${organizationId}/analytics`}><span>R</span>Analytics</Link><Link href={`/dashboard/organizations/${organizationId}/team`}><span>T</span>Team</Link></nav><p className="workspace-boundary">Candidates see only sent offers. Hiring remains a separate human-controlled pipeline decision.</p></aside><div className="workspace-content"><header className="workspace-header"><div><span className="connection-dot" />Workspace active</div><div><NotificationCenter organizationId={organizationId} /><span>{user.email}</span><LogoutButton /></div></header><OfferWorkspace organizationId={organizationId} organizationName={membership.organization.name} canManage={hasPermission(membership.role, "offer:manage")} applications={applications.map((application) => ({ ...application, offer: application.offer ? { ...application.offer, expiresAt: application.offer.expiresAt?.toISOString() ?? null, sentAt: application.offer.sentAt?.toISOString() ?? null, respondedAt: application.offer.respondedAt?.toISOString() ?? null, updatedAt: application.offer.updatedAt.toISOString() } : null }))} /></div></div>;
}
