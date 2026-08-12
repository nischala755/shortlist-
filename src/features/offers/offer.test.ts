import { describe, expect, it } from "vitest";
import { OfferValidationError, validateCandidateOfferDecision, validateOfferInput, validateOfferPatch } from "./offer";

describe("offer validation", () => {
  it("accepts a future-dated offer", () => {
    expect(validateOfferInput({ title: "Engineer offer", details: "We would like to offer you the role", expiresAt: new Date(Date.now() + 86_400_000).toISOString() }).title).toBe("Engineer offer");
  });

  it("rejects expired offers", () => {
    expect(() => validateOfferInput({ title: "Offer", details: "Details", expiresAt: new Date(Date.now() - 1_000).toISOString() })).toThrow(OfferValidationError);
  });

  it("validates an individual offer field during a partial update", () => {
    expect(validateOfferPatch({ title: " Updated offer " })).toEqual({ title: "Updated offer" });
  });

  it("accepts only candidate response statuses", () => {
    expect(validateCandidateOfferDecision({ status: "ACCEPTED", responseNote: "Thank you" }).status).toBe("ACCEPTED");
    expect(() => validateCandidateOfferDecision({ status: "SENT" })).toThrow(OfferValidationError);
  });
});
