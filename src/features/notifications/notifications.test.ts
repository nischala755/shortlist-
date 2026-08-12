import { beforeEach, describe, expect, it, vi } from "vitest";
import { createNotification, notifyCandidateAssessmentAssigned, notifyCandidateOfferSent, notifyOfferCreatorOfResponse } from "./notifications";
import { getPrisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));
const mockedGetPrisma = vi.mocked(getPrisma);

describe("notifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an in-app notification with metadata", async () => {
    const create = vi.fn().mockResolvedValue({ id: "n-1" });
    mockedGetPrisma.mockReturnValue({ notification: { create } } as never);
    await createNotification({ organizationId: "o-1", userId: "u-1", type: "OFFER_SENT", title: "Offer", body: "New offer", metadata: { offerId: "off-1" } });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId: "o-1", userId: "u-1", type: "OFFER_SENT", metadata: { offerId: "off-1" } }) }));
  });

  it("does not create an offer notification without a candidate portal account", async () => {
    mockedGetPrisma.mockReturnValue({ application: { findFirst: vi.fn().mockResolvedValue(null) }, notification: { create: vi.fn() } } as never);
    await expect(notifyCandidateOfferSent({ organizationId: "o-1", applicationId: "a-1", offerId: "off-1", title: "Offer" })).resolves.toBeNull();
  });

  it("notifies the candidate when an assessment is assigned", async () => {
    const create = vi.fn().mockResolvedValue({ id: "n-2" });
    mockedGetPrisma.mockReturnValue({ application: { findFirst: vi.fn().mockResolvedValue({ candidate: { email: "ada@example.com" } }) }, membership: { findFirst: vi.fn().mockResolvedValue({ userId: "u-2" }) }, notification: { create } } as never);
    await notifyCandidateAssessmentAssigned({ organizationId: "o-1", applicationId: "a-1", assessmentId: "as-1", title: "TypeScript exercise" });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "u-2", type: "ASSESSMENT_ASSIGNED" }) }));
  });

  it("notifies the offer creator of a candidate response", async () => {
    const create = vi.fn().mockResolvedValue({ id: "n-3" });
    mockedGetPrisma.mockReturnValue({ offer: { findFirst: vi.fn().mockResolvedValue({ createdById: "u-1", application: { candidate: { name: "Ada" } } }) }, notification: { create } } as never);
    await notifyOfferCreatorOfResponse({ organizationId: "o-1", applicationId: "a-1", offerId: "off-1", status: "ACCEPTED" });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "u-1", type: "OFFER_RESPONSE", title: "Offer accepted" }) }));
  });
});
