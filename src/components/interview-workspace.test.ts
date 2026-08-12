import { describe, expect, it } from "vitest";
import { upcomingInterviews } from "./interview-workspace";

const application = { id: "a-1", currentStage: "INTERVIEW", candidate: { name: "Ada", email: "ada@example.com" }, job: { title: "Engineer" }, interviews: [
  { id: "i-2", scheduledStart: "2027-01-02T10:00:00.000Z", scheduledEnd: "2027-01-02T11:00:00.000Z", location: "Room 2", meetingUrl: null, status: "SCHEDULED" as const, interviewer: { id: "u-1", email: "one@example.com" }, scorecard: null },
  { id: "i-1", scheduledStart: "2027-01-01T10:00:00.000Z", scheduledEnd: "2027-01-01T11:00:00.000Z", location: "Room 1", meetingUrl: null, status: "SCHEDULED" as const, interviewer: { id: "u-1", email: "one@example.com" }, scorecard: null },
  { id: "i-3", scheduledStart: "2026-12-01T10:00:00.000Z", scheduledEnd: "2026-12-01T11:00:00.000Z", location: "Room 1", meetingUrl: null, status: "CANCELLED" as const, interviewer: { id: "u-1", email: "one@example.com" }, scorecard: null },
] };

describe("upcoming interview schedule", () => {
  it("keeps scheduled interviews in chronological order", () => expect(upcomingInterviews([application]).map((item) => item.id)).toEqual(["i-1", "i-2"]));
  it("excludes cancelled interviews", () => expect(upcomingInterviews([application]).some((item) => item.id === "i-3")).toBe(false));
});
