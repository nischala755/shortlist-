import { describe, expect, it } from "vitest";
import { requirementCoverage } from "./evidence-workspace";

const requirements = [{ id: "r-1", title: "TypeScript", description: "Production use" }, { id: "r-2", title: "Operations", description: "Incident response" }];
const evidence = [{ id: "e-1", title: "API", details: "Built API", sourceType: "RESUME", sourceReference: null, jobRequirementId: "r-1", createdAt: "", createdBy: { email: "reviewer@example.com" } }];

describe("requirement coverage", () => {
  it("links evidence only to its stated requirement", () => expect(requirementCoverage(requirements, evidence).map((item) => item.evidence.length)).toEqual([1, 0]));
  it("does not count unlinked evidence as requirement coverage", () => expect(requirementCoverage(requirements, [{ ...evidence[0], jobRequirementId: null }]).every((item) => item.evidence.length === 0)).toBe(true));
});
