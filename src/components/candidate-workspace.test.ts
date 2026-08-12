import { describe, expect, it } from "vitest";
import { searchCandidates } from "./candidate-workspace";

const candidates = [
  { id: "1", name: "Ada Lovelace", email: "ada@example.com", phone: null, createdAt: "", updatedAt: "", resumes: [], applications: [] },
  { id: "2", name: "Grace Hopper", email: "grace@example.com", phone: null, createdAt: "", updatedAt: "", resumes: [], applications: [] },
];

describe("candidate workspace search", () => {
  it("matches a candidate name without case sensitivity", () => expect(searchCandidates(candidates, "LOVELACE").map((candidate) => candidate.id)).toEqual(["1"]));
  it("matches candidate email", () => expect(searchCandidates(candidates, "grace@").map((candidate) => candidate.id)).toEqual(["2"]));
  it("keeps all candidates for an empty query", () => expect(searchCandidates(candidates, " ")).toHaveLength(2));
});
