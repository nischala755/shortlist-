import { describe, expect, it } from "vitest";
import { ApplicationValidationError, validateApplicationInput } from "./application";

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
});
