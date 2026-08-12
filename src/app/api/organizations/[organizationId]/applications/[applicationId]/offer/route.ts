import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { OfferValidationError, validateOfferInput, validateOfferPatch, validateOfferStatus } from "@/features/offers/offer";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { notifyCandidateOfferSent } from "@/features/notifications/notifications";
import { recordAuditLog } from "@/features/audit/audit";

const offerSelect = {
  id: true, title: true, details: true, compensationDetails: true, expiresAt: true, status: true, sentAt: true, respondedAt: true, responseNote: true, createdAt: true, updatedAt: true,
  createdBy: { select: { id: true, email: true } },
} as const;

async function authorize(request: Request, organizationId: string, permission: "offer:read" | "offer:manage") {
  const user = await getCurrentUser(request);
  if (!user) return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  const access = await canAccessOrganization(organizationId, user.id, permission);
  if (!access.membership) return { response: NextResponse.json({ error: "Organization not found" }, { status: 404 }) };
  if (!access.allowed) return { response: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  return { user };
}

export async function GET(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string }> }) {
  try {
    const { organizationId, applicationId } = await context.params;
    const access = await authorize(request, organizationId, "offer:read");
    if (access.response) return access.response;
    const offer = await getPrisma().offer.findFirst({ where: { organizationId, applicationId }, select: offerSelect });
    if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    return NextResponse.json({ offer });
  } catch (error) {
    logger.error("Offer lookup failed", error);
    return NextResponse.json({ error: "Unable to load offer" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string }> }) {
  try {
    const { organizationId, applicationId } = await context.params;
    const access = await authorize(request, organizationId, "offer:manage");
    if (access.response) return access.response;
    const input = validateOfferInput(await request.json());
    const prisma = getPrisma();
    const application = await prisma.application.findFirst({ where: { id: applicationId, organizationId }, select: { id: true } });
    if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    const offer = await prisma.offer.create({ data: { organizationId, applicationId, createdById: access.user.id, ...input }, select: offerSelect });
    return NextResponse.json({ offer }, { status: 201 });
  } catch (error) {
    if (error instanceof OfferValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return NextResponse.json({ error: "This application already has an offer" }, { status: 409 });
    logger.error("Offer creation failed", error);
    return NextResponse.json({ error: "Unable to create offer" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string }> }) {
  try {
    const { organizationId, applicationId } = await context.params;
    const access = await authorize(request, organizationId, "offer:manage");
    if (access.response) return access.response;
    const prisma = getPrisma();
    const existing = await prisma.offer.findFirst({ where: { organizationId, applicationId }, select: { id: true, status: true, expiresAt: true } });
    if (!existing) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    const body = await request.json() as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (body.status !== undefined) {
      const status = validateOfferStatus(body.status);
      const validTransition = (existing.status === "DRAFT" && status === "SENT") || (existing.status === "SENT" && status === "WITHDRAWN");
      if (!validTransition) return NextResponse.json({ error: "Offer status transition is not allowed" }, { status: 409 });
      if (status === "SENT" && existing.expiresAt && existing.expiresAt <= new Date()) return NextResponse.json({ error: "Offer expiry must be in the future before sending" }, { status: 409 });
      data.status = status;
      if (status === "SENT") data.sentAt = new Date();
    }
    if (body.title !== undefined || body.details !== undefined || body.compensationDetails !== undefined || body.expiresAt !== undefined) {
      if (existing.status !== "DRAFT") return NextResponse.json({ error: "Only draft offers can be edited" }, { status: 409 });
      Object.assign(data, validateOfferPatch(body));
    }
    if (Object.keys(data).length === 0) return NextResponse.json({ error: "No offer changes supplied" }, { status: 400 });
    const offer = await prisma.offer.update({ where: { id: existing.id }, data, select: offerSelect });
    if (data.status === "SENT") {
      try {
        await notifyCandidateOfferSent({ organizationId, applicationId, offerId: offer.id, title: offer.title });
      } catch (notificationError) {
        logger.error("Offer notification creation failed", notificationError);
      }
    }
    if (typeof data.status === "string") {
      try {
        await recordAuditLog({ organizationId, actorId: access.user.id, action: `OFFER_${data.status}`, entityType: "Offer", entityId: offer.id, metadata: { applicationId } });
      } catch (auditError) {
        logger.error("Offer audit failed", auditError);
      }
    }
    return NextResponse.json({ offer });
  } catch (error) {
    if (error instanceof OfferValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    logger.error("Offer update failed", error);
    return NextResponse.json({ error: "Unable to update offer" }, { status: 500 });
  }
}
