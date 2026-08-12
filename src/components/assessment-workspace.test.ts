import { describe, expect, it } from "vitest";
import { canTransitionAssessmentStatus } from "@/features/coding-assessments/assessment";
describe("assessment workspace lifecycle", () => { it("does not reopen a closed assessment", () => expect(canTransitionAssessmentStatus("CLOSED", "ASSIGNED")).toBe(false)); });
