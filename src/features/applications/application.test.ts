import { describe, expect, it } from "vitest";
import {
  ApplicationValidationError,
  canTransitionApplicationStage,
  validateApplicationInput,
  validateApplicationStage,
} from "./application";

describe("validateApplicationInput", () => {
  it("accepts job and candidate references", () => {
    expect(validateApplicationInput({ jobId: " job-1 ", candidateId: " candidate-1 " })).toEqual({
      jobId: "job-1",
      candidateId: "candidate-1",
    });
  });

  it("rejects missing references", () => {
    expect(() => validateApplicationInput({ jobId: "job-1" })).toThrow(ApplicationValidationError);
  });

  it("allows only explicit forward transitions", () => {
    expect(canTransitionApplicationStage("APPLIED", "SCREENING")).toBe(true);
    expect(canTransitionApplicationStage("APPLIED", "OFFER")).toBe(false);
    expect(canTransitionApplicationStage("HIRED", "INTERVIEW")).toBe(false);
    expect(() => validateApplicationStage("UNKNOWN")).toThrow(ApplicationValidationError);
  });
});
