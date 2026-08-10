import { describe, expect, it } from "vitest";
import { EvidenceValidationError, validateEvidenceInput } from "./evidence";

describe("validateEvidenceInput", () => {
  it("normalizes valid evidence", () => {
    expect(validateEvidenceInput({ title: "  TypeScript project  ", details: " Built a service ", sourceType: "RESUME" })).toEqual({
      title: "TypeScript project", details: "Built a service", sourceType: "RESUME", sourceReference: null, jobRequirementId: null,
    });
  });

  it("rejects invalid evidence source", () => {
    expect(() => validateEvidenceInput({ title: "Evidence", details: "Details", sourceType: "AI" })).toThrow(EvidenceValidationError);
  });

  it("requires meaningful details", () => {
    expect(() => validateEvidenceInput({ title: "Evidence", details: "", sourceType: "MANUAL" })).toThrow(EvidenceValidationError);
  });
});
