import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("liveness health check", () => {
  it("returns a minimal successful response", async () => {
    const response = GET();
    await expect(response.json()).resolves.toEqual({ status: "ok" });
    expect(response.status).toBe(200);
  });
});
