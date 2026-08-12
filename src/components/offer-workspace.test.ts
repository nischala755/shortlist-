import { describe, expect, it } from "vitest";
import { countOffers, type OfferApplication } from "./offer-workspace";

function application(status: "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED" | "WITHDRAWN" | null): OfferApplication {
  return { id: status ?? "none", currentStage: "OFFER", candidate: { name: "Ada", email: "ada@example.com" }, job: { title: "Engineer" }, offer: status ? { id: status, title: "Offer", details: "Details", compensationDetails: null, expiresAt: null, status, sentAt: null, respondedAt: null, responseNote: null, updatedAt: new Date().toISOString(), createdBy: { email: "recruiter@example.com" } } : null };
}

describe("offer workspace summary", () => {
  it("counts each lifecycle state without treating an undrafted application as an offer", () => {
    const counts = countOffers([application("DRAFT"), application("SENT"), application("ACCEPTED"), application(null)]);
    expect(counts).toMatchObject({ DRAFT: 1, SENT: 1, ACCEPTED: 1, DECLINED: 0, WITHDRAWN: 0 });
  });
});
