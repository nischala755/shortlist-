import { describe, expect, it } from "vitest";
import { AssessmentValidationError, validateAssessmentInput, validateAssessmentPatch, validateQuestionInput } from "./assessment";

describe("coding assessment validation", () => {
  it("accepts a valid assessment", () => {
    expect(validateAssessmentInput({ title: "TypeScript task", instructions: "Implement the function", durationMinutes: 60 })).toEqual({ title: "TypeScript task", instructions: "Implement the function", durationMinutes: 60 });
  });

  it("rejects invalid duration", () => {
    expect(() => validateAssessmentInput({ title: "Task", instructions: "Do it", durationMinutes: 2 })).toThrow(AssessmentValidationError);
  });

  it("validates an individual assessment field during a partial update", () => {
    expect(validateAssessmentPatch({ title: " Updated task " })).toEqual({ title: "Updated task" });
  });

  it("defaults question points", () => {
    expect(validateQuestionInput({ prompt: "Write a function" })).toMatchObject({ prompt: "Write a function", points: 1 });
  });
});
