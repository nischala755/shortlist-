import { describe, expect, it } from "vitest";
import { CandidateValidationError, validateCandidateInput, validateCandidateUpdateInput } from "./candidate";

describe("validateCandidateInput", () => {
  it("normalizes a candidate", () => {
    expect(validateCandidateInput({ name: " Ada Lovelace ", email: " ADA@EXAMPLE.COM " })).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
    });
  });

  it("rejects invalid candidate data", () => {
    expect(() => validateCandidateInput({ name: "A", email: "invalid" })).toThrow(CandidateValidationError);
  });

  it("allows an existing phone number to be cleared", () => {
    expect(validateCandidateUpdateInput({ name: "Ada Lovelace", email: "ada@example.com", phone: "" })).toMatchObject({ phone: null });
  });
});
