import { describe, expect, it } from "vitest";
import { buildEvidenceGapReport } from "./gaps";

describe("buildEvidenceGapReport", () => {
  it("reports covered and missing requirements deterministically", () => {
    const report = buildEvidenceGapReport(
      [{ id: "r-1", title: "TypeScript", description: "Strong TypeScript" }, { id: "r-2", title: "Testing", description: "Writes tests" }],
      [{ id: "e-1", jobRequirementId: "r-1" }],
    );
    expect(report.summary).toEqual({ totalRequirements: 2, coveredRequirements: 1, missingRequirements: 1, coveragePercent: 50 });
    expect(report.gaps.map((gap) => gap.id)).toEqual(["r-2"]);
  });

  it("returns zero coverage when a job has no requirements", () => {
    expect(buildEvidenceGapReport([], []).summary.coveragePercent).toBe(0);
  });
});
