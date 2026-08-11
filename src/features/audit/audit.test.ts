import { describe, expect, it } from "vitest";
import { validateAuditFilter } from "./audit";

describe("audit filters", () => {
  it("accepts bounded filters", () => {
    expect(validateAuditFilter("APPLICATION_STAGE_CHANGED", "Action")).toBe("APPLICATION_STAGE_CHANGED");
  });

  it("rejects oversized filters", () => {
    expect(() => validateAuditFilter("x".repeat(101), "Action")).toThrow();
  });
});
