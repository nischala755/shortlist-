import { beforeEach, describe, expect, it, vi } from "vitest";
import { createNotification, notifyCandidateOfferSent } from "./notifications";
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
});
