import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

describe("security proxy", () => {
  it("adds defensive response headers", () => {
    const response = proxy(new NextRequest("http://localhost/api/health"));
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  });

  it("rejects oversized requests before route handling", () => {
    const response = proxy(new NextRequest("http://localhost/api/organizations", { headers: { "content-length": String(12 * 1024 * 1024) } }));
    expect(response.status).toBe(413);
  });
});
