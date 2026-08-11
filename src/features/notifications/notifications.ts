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
