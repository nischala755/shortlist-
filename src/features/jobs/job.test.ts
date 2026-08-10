import { describe, expect, it } from "vitest";
import { JobValidationError, validateJobInput } from "./job";

describe("validateJobInput", () => {
  it("trims a valid draft job", () => {
    expect(validateJobInput({ title: " Engineer ", description: " Build systems " })).toEqual({
      title: "Engineer",
      description: "Build systems",
    });
  });

  it("rejects incomplete jobs", () => {
    expect(() => validateJobInput({ title: "A", description: "" })).toThrow(JobValidationError);
  });
});
