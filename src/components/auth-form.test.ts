import { describe, expect, it } from "vitest";
import { responseError } from "./auth-form";

describe("authentication form responses", () => {
  it("returns a public API error message", async () => {
    await expect(responseError(Response.json({ error: "Verify your email before signing in" }, { status: 403 }))).resolves.toBe("Verify your email before signing in");
  });

  it("uses a safe fallback for malformed responses", async () => {
    await expect(responseError(new Response("not-json", { status: 500 }))).resolves.toBe("Something went wrong. Please try again.");
  });
});
