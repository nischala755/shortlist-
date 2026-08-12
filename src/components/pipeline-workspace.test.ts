import { describe, expect, it } from "vitest";
import { applicationsForJob } from "./pipeline-workspace";

const applications = [
  { id: "a-1", currentStage: "APPLIED" as const, createdAt: "", updatedAt: "", candidate: { id: "c-1", name: "Ada", email: "ada@example.com" }, job: { id: "j-1", title: "Engineer" }, stageHistory: [] },
  { id: "a-2", currentStage: "SCREENING" as const, createdAt: "", updatedAt: "", candidate: { id: "c-2", name: "Grace", email: "grace@example.com" }, job: { id: "j-2", title: "Designer" }, stageHistory: [] },
];

describe("pipeline job filter", () => {
  it("keeps every application for the all-jobs view", () => expect(applicationsForJob(applications, "ALL")).toHaveLength(2));
  it("keeps applications belonging to the selected job", () => expect(applicationsForJob(applications, "j-2").map((application) => application.id)).toEqual(["a-2"]));
});
