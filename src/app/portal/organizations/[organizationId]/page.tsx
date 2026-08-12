import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { CandidatePortal } from "@/components/candidate-portal";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser } from "@/features/auth/session";
import { getPrisma } from "@/lib/db";

export default async function CandidatePortalPage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const user = await getCurrentUser(new Request(process.env.APP_URL ?? "http://localhost:3000", { headers: await headers() }));
  if (!user) redirect("/login");
  const prisma = getPrisma();
  const membership = await prisma.membership.findUnique({ where: { organizationId_userId: { organizationId, userId: user.id } }, select: { role: true, organization: { select: { name: true } } } });
  if (!membership) notFound();
  if (membership.role !== "CANDIDATE") redirect(`/dashboard/organizations/${organizationId}`);
  const candidate = await prisma.candidate.findFirst({ where: { organizationId, email: user.email.toLowerCase() }, select: { id: true, name: true, email: true } });
  if (!candidate) notFound();
  const applications = await prisma.application.findMany({ where: { organizationId, candidateId: candidate.id }, orderBy: { createdAt: "desc" }, select: { id: true, currentStage: true, createdAt: true, job: { select: { id: true, title: true, description: true } }, codingAssessments: { where: { status: "ASSIGNED" }, orderBy: { createdAt: "desc" }, select: { id: true, title: true, durationMinutes: true, status: true, submission: { select: { status: true, startedAt: true, submittedAt: true } } } }, offer: { select: { id: true, title: true, status: true, expiresAt: true } } } });
  return <div className="portal-shell"><header className="portal-header"><Brand /><div><span>{membership.organization.name}</span><LogoutButton /></div></header><CandidatePortal organizationId={organizationId} organizationName={membership.organization.name} candidate={candidate} applications={applications.map(application => ({ ...application, createdAt: application.createdAt.toISOString(), codingAssessments: application.codingAssessments.map(assessment => ({ ...assessment, submission: assessment.submission ? { ...assessment.submission, startedAt: assessment.submission.startedAt.toISOString(), submittedAt: assessment.submission.submittedAt?.toISOString() ?? null } : null })), offer: application.offer && application.offer.status !== "DRAFT" ? { ...application.offer, expiresAt: application.offer.expiresAt?.toISOString() ?? null } : null }))} /></div>;
}
