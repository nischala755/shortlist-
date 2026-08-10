import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes structured errors without exposing arbitrary values", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error("database health check", new Error("connection refused"));

    expect(consoleError).toHaveBeenCalledWith(
      JSON.stringify({
        level: "error",
        context: "database health check",
        error: { name: "Error", message: "connection refused" },
      }),
    );
  });
});
