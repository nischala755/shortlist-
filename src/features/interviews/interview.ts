import { InterviewStatus } from "@/generated/prisma/client";

export const interviewStatuses = Object.values(InterviewStatus);

export class InterviewValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InterviewValidationError";
  }
}

export function validateInterviewInput(value: unknown, options: { allowPast?: boolean } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InterviewValidationError("Interview data must be an object");
  const input = value as Record<string, unknown>;
  const interviewerId = typeof input.interviewerId === "string" ? input.interviewerId.trim() : "";
  const start = typeof input.scheduledStart === "string" ? new Date(input.scheduledStart) : new Date(NaN);
  const end = typeof input.scheduledEnd === "string" ? new Date(input.scheduledEnd) : new Date(NaN);
  const location = input.location === undefined || input.location === null || input.location === "" ? null : typeof input.location === "string" ? input.location.trim() : "invalid";
  const meetingUrl = input.meetingUrl === undefined || input.meetingUrl === null || input.meetingUrl === "" ? null : typeof input.meetingUrl === "string" ? input.meetingUrl.trim() : "invalid";
  const status = input.status === undefined ? "SCHEDULED" : typeof input.status === "string" ? input.status : "invalid";

  if (!interviewerId) throw new InterviewValidationError("An interviewer is required");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new InterviewValidationError("Interview times must be valid ISO dates");
  if (end <= start) throw new InterviewValidationError("Interview end must be after the start");
  if (!options.allowPast && start.getTime() < Date.now() - 5 * 60 * 1000) throw new InterviewValidationError("Interview start cannot be in the past");
  if (location === "invalid" || (typeof location === "string" && location.length > 500)) throw new InterviewValidationError("Location must be at most 500 characters");
  if (meetingUrl === "invalid" || (typeof meetingUrl === "string" && meetingUrl.length > 2_000)) throw new InterviewValidationError("Meeting URL is invalid");
  if (meetingUrl) {
    try { new URL(meetingUrl); } catch { throw new InterviewValidationError("Meeting URL must be a valid URL"); }
  }
  if (!location && !meetingUrl) throw new InterviewValidationError("A location or meeting URL is required");
  if (!interviewStatuses.includes(status as InterviewStatus)) throw new InterviewValidationError("Interview status is invalid");
  if (status === "COMPLETED" && end > new Date()) throw new InterviewValidationError("A future interview cannot be completed");

  return { interviewerId, scheduledStart: start, scheduledEnd: end, location, meetingUrl, status: status as InterviewStatus };
}
