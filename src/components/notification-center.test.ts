import { describe, expect, it } from "vitest";
import { notificationTarget } from "./notification-center";

const base = { id: "n-1", organizationId: "o-1", title: "Update", body: "Body", metadata: {}, readAt: null, createdAt: new Date().toISOString() } as const;

describe("notification destinations", () => {
  it("routes candidate actions back to their organization portal", () => expect(notificationTarget({ ...base, type: "ASSESSMENT_ASSIGNED" }, true)).toBe("/portal/organizations/o-1"));
  it("routes offer responses to the hiring team offer workspace", () => expect(notificationTarget({ ...base, type: "OFFER_RESPONSE" }, false)).toBe("/dashboard/organizations/o-1/offers"));
  it("routes interview assignments to the schedule", () => expect(notificationTarget({ ...base, type: "INTERVIEW_SCHEDULED" }, false)).toBe("/dashboard/organizations/o-1/interviews"));
});
