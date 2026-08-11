import { describe, expect, it } from "vitest";
import { countBy, parseAnalyticsDateRange } from "./analytics";

describe("analytics helpers", () => {
  it("counts grouped values", () => {
    expect(countBy(["DRAFT", "DRAFT", "PUBLISHED"])).toEqual({ DRAFT: 2, PUBLISHED: 1 });
  });

  it("validates an ISO date range", () => {
    expect(parseAnalyticsDateRange("2026-01-01", "2026-01-31").from).toBeInstanceOf(Date);
    expect(() => parseAnalyticsDateRange("2026-02-01", "2026-01-01")).toThrow();
  });
});
