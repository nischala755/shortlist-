import { describe, expect, it } from "vitest";
import { InterviewValidationError, validateInterviewInput } from "./interview";

function validInput() {
  const start = new Date(Date.now() + 60 * 60 * 1000);
  const end = new Date(start.getTime() + 45 * 60 * 1000);
  return { interviewerId: "u-2", scheduledStart: start.toISOString(), scheduledEnd: end.toISOString(), meetingUrl: "https://meet.example/interview" };
}

describe("validateInterviewInput", () => {
  it("normalizes valid scheduled interviews", () => {
    const result = validateInterviewInput(validInput());
    expect(result.interviewerId).toBe("u-2");
    expect(result.status).toBe("SCHEDULED");
    expect(result.scheduledEnd.getTime()).toBeGreaterThan(result.scheduledStart.getTime());
  });

  it("requires an access detail", () => {
    expect(() => validateInterviewInput({ ...validInput(), meetingUrl: undefined })).toThrow(InterviewValidationError);
  });

  it("rejects an interview in the past", () => {
    const start = new Date(Date.now() - 60 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    expect(() => validateInterviewInput({ ...validInput(), scheduledStart: start.toISOString(), scheduledEnd: end.toISOString(), location: "Room 1", meetingUrl: undefined })).toThrow("cannot be in the past");
  });
});
