import { describe, expect, it } from "vitest";
import { ScorecardValidationError, validateScorecardInput } from "./scorecard";

const validInput = { criteria: [{ name: "Communication", rating: 4, notes: "Clear answers" }], overallRating: 4, strengths: "Strong communicator", concerns: "None", notes: "Human reviewer notes" };

describe("validateScorecardInput", () => {
  it("normalizes a structured scorecard", () => {
    expect(validateScorecardInput({ ...validInput, strengths: "  Strong communicator " })).toMatchObject({ overallRating: 4, strengths: "Strong communicator" });
  });

  it("rejects ratings outside the 1-to-5 range", () => {
    expect(() => validateScorecardInput({ ...validInput, criteria: [{ name: "Communication", rating: 6 }] })).toThrow(ScorecardValidationError);
  });

  it("requires at least one criterion", () => {
    expect(() => validateScorecardInput({ ...validInput, criteria: [] })).toThrow(ScorecardValidationError);
  });
});
