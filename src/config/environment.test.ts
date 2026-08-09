import { describe, expect, it } from "vitest";
import { getEnvironment } from "./environment";

describe("getEnvironment", () => {
  it("defaults to development", () => {
    expect(getEnvironment(undefined)).toBe("development");
  });

  it("accepts supported environments", () => {
    expect(getEnvironment("test")).toBe("test");
    expect(getEnvironment("production")).toBe("production");
  });

  it("rejects unsupported environments", () => {
    expect(() => getEnvironment("staging")).toThrow(
      "APP_ENV must be development, test, or production",
    );
  });
});
