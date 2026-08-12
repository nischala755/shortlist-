import { NextResponse } from "next/server";
import { getCandidatePortalContext } from "@/features/candidate-portal/access";
import { OfferValidationError, validateCandidateOfferDecision } from "@/features/offers/offer";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { recordAuditLog } from "@/features/audit/audit";

const candidateOfferSelect = { id: true, title: true, details: true, compensationDetails: true, expiresAt: true, status: true, sentAt: true, respondedAt: true, responseNote: true } as const;

async function findCandidateOffer(organizationId: string, applicationId: string, candidateId: string) {
  return getPrisma().offer.findFirst({ where: { organizationId, applicationId, status: { not: "DRAFT" }, application: { candidateId } }, select: candidateOfferSelect });
}

export async function GET(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string }> }) {
  try {
    const { organizationId, applicationId } = await context.params;
    const access = await getCandidatePortalContext(request, organizationId);
    if (access.response) return NextResponse.json({ error: access.response }, { status: access.status });
    const offer = await findCandidateOffer(organizationId, applicationId, access.candidate.id);
    if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    return NextResponse.json({ offer });
  } catch (error) {
    logger.error("Candidate offer lookup failed", error);
    return NextResponse.json({ error: "Unable to load candidate offer" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ organizationId: string; applicationId: string }> }) {
  try {
    const { organizationId, applicationId } = await context.params;
    const access = await getCandidatePortalContext(request, organizationId);
    if (access.response) return NextResponse.json({ error: access.response }, { status: access.status });
    const offer = await findCandidateOffer(organizationId, applicationId, access.candidate.id);
    if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    if (offer.status !== "SENT") return NextResponse.json({ error: "This offer is no longer awaiting a response" }, { status: 409 });
    if (offer.expiresAt && offer.expiresAt <= new Date()) return NextResponse.json({ error: "Offer has expired" }, { status: 409 });
    const input = validateCandidateOfferDecision(await request.json());
    const prisma = getPrisma();
    const result = await prisma.offer.updateMany({ where: { id: offer.id, status: "SENT" }, data: { status: input.status, responseNote: input.responseNote, respondedAt: new Date() } });
    if (result.count !== 1) return NextResponse.json({ error: "This offer is no longer awaiting a response" }, { status: 409 });
    const updated = await prisma.offer.findUniqueOrThrow({ where: { id: offer.id }, select: candidateOfferSelect });
    try {
      await recordAuditLog({ organizationId, actorId: access.user.id, action: `OFFER_${input.status}`, entityType: "Offer", entityId: offer.id, metadata: { applicationId } });
    } catch (auditError) {
      logger.error("Candidate offer response audit failed", auditError);
    }
    return NextResponse.json({ offer: updated });
  } catch (error) {
    if (error instanceof OfferValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    logger.error("Candidate offer response failed", error);
    return NextResponse.json({ error: "Unable to respond to offer" }, { status: 500 });
  }
}
