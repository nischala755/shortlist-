import { describe, expect, it } from "vitest";
import { buildAnalyticsInsights, countBy, parseAnalyticsDateRange } from "./analytics";

describe("analytics helpers", () => {
  it("counts grouped values", () => {
    expect(countBy(["DRAFT", "DRAFT", "PUBLISHED"])).toEqual({ DRAFT: 2, PUBLISHED: 1 });
  });

  it("validates an ISO date range", () => {
    expect(parseAnalyticsDateRange("2026-01-01", "2026-01-31").from).toBeInstanceOf(Date);
    expect(parseAnalyticsDateRange("2026-01-01", "2026-01-31").to?.toISOString()).toBe("2026-01-31T23:59:59.999Z");
    expect(() => parseAnalyticsDateRange("2026-02-01", "2026-01-01")).toThrow();
  });

  it("calculates rates only when a meaningful denominator exists", () => {
    expect(buildAnalyticsInsights({ candidates: 2, resumes: 3, evidence: 5, interviews: { COMPLETED: 3, CANCELLED: 1 }, offers: { ACCEPTED: 2, DECLINED: 1, SENT: 4 } })).toEqual({ offerAcceptanceRate: 67, interviewCompletionRate: 75, resumesPerCandidate: 1.5, evidencePerCandidate: 2.5 });
    expect(buildAnalyticsInsights({ candidates: 0, resumes: 0, evidence: 0, interviews: {}, offers: {} }).offerAcceptanceRate).toBeNull();
  });
});
