import { describe, expect, it } from "vitest";
import { SubmissionValidationError, validateSubmissionInput } from "./submission";

describe("validateSubmissionInput", () => {
  it("accepts a draft with partial answers", () => {
    expect(validateSubmissionInput({ status: "DRAFT", answers: { "q-1": "partial" } }, ["q-1", "q-2"]).status).toBe("DRAFT");
  });

  it("requires every question for final submission", () => {
    expect(() => validateSubmissionInput({ status: "SUBMITTED", answers: { "q-1": "answer" } }, ["q-1", "q-2"])).toThrow(SubmissionValidationError);
  });

  it("rejects answers for unknown questions", () => {
    expect(() => validateSubmissionInput({ status: "DRAFT", answers: { "q-other": "answer" } }, ["q-1"])).toThrow(SubmissionValidationError);
  });
});
