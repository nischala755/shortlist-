import { describe, expect, it } from "vitest";
import { filterJobs } from "./job-workspace";

const jobs = [
  { id: "1", title: "Engineer", description: "Build", status: "DRAFT" as const, createdAt: "2026-08-01", updatedAt: "2026-08-01", applicationCount: 0, requirements: [] },
  { id: "2", title: "Designer", description: "Design", status: "PUBLISHED" as const, createdAt: "2026-08-01", updatedAt: "2026-08-01", applicationCount: 2, requirements: [] },
];

describe("job workspace filters", () => {
  it("keeps all jobs in the all view", () => expect(filterJobs(jobs, "ALL")).toHaveLength(2));
  it("returns only jobs with the requested lifecycle state", () => expect(filterJobs(jobs, "PUBLISHED").map((job) => job.id)).toEqual(["2"]));
});
