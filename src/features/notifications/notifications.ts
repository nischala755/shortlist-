import { NotificationType } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";

type NotificationInput = {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, string>;
};

export async function createNotification(input: NotificationInput) {
  return getPrisma().notification.create({ data: { ...input, metadata: input.metadata ?? undefined } });
}

export async function notifyInterviewerScheduled(input: { organizationId: string; interviewerId: string; interviewId: string; scheduledStart: Date }) {
  return createNotification({
    organizationId: input.organizationId,
    userId: input.interviewerId,
    type: "INTERVIEW_SCHEDULED",
    title: "Interview scheduled",
    body: `An interview has been scheduled for ${input.scheduledStart.toISOString()}.`,
    metadata: { interviewId: input.interviewId },
  });
}

export async function notifyCandidateOfferSent(input: { organizationId: string; applicationId: string; offerId: string; title: string }) {
  const application = await getPrisma().application.findFirst({ where: { id: input.applicationId, organizationId: input.organizationId }, select: { candidate: { select: { email: true } } } });
  if (!application) return null;
  const membership = await getPrisma().membership.findFirst({
    where: { organizationId: input.organizationId, role: "CANDIDATE", user: { email: application.candidate.email } },
    select: { userId: true },
  });
  if (!membership) return null;
  return createNotification({
    organizationId: input.organizationId,
    userId: membership.userId,
    type: "OFFER_SENT",
    title: "New offer available",
    body: `A new offer is available: ${input.title}.`,
    metadata: { applicationId: input.applicationId, offerId: input.offerId },
  });
}

async function candidateUserId(organizationId: string, applicationId: string) {
  const application = await getPrisma().application.findFirst({ where: { id: applicationId, organizationId }, select: { candidate: { select: { email: true } } } });
  if (!application) return null;
  const membership = await getPrisma().membership.findFirst({ where: { organizationId, role: "CANDIDATE", user: { email: application.candidate.email } }, select: { userId: true } });
  return membership?.userId ?? null;
}

export async function notifyCandidateAssessmentAssigned(input: { organizationId: string; applicationId: string; assessmentId: string; title: string }) {
  const userId = await candidateUserId(input.organizationId, input.applicationId);
  if (!userId) return null;
  return createNotification({
    organizationId: input.organizationId,
    userId,
    type: "ASSESSMENT_ASSIGNED",
    title: "Assessment assigned",
    body: `A coding assessment is ready: ${input.title}.`,
    metadata: { applicationId: input.applicationId, assessmentId: input.assessmentId },
  });
}

export async function notifyOfferCreatorOfResponse(input: { organizationId: string; applicationId: string; offerId: string; status: "ACCEPTED" | "DECLINED" }) {
  const offer = await getPrisma().offer.findFirst({ where: { id: input.offerId, organizationId: input.organizationId, applicationId: input.applicationId }, select: { createdById: true, application: { select: { candidate: { select: { name: true } } } } } });
  if (!offer) return null;
  return createNotification({
    organizationId: input.organizationId,
    userId: offer.createdById,
    type: "OFFER_RESPONSE",
    title: `Offer ${input.status.toLowerCase()}`,
    body: `${offer.application.candidate.name} ${input.status === "ACCEPTED" ? "accepted" : "declined"} the offer.`,
    metadata: { applicationId: input.applicationId, offerId: input.offerId },
  });
}
