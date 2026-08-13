import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const originalEnvironment = process.env.APP_ENV;

afterEach(() => {
  if (originalEnvironment === undefined) delete process.env.APP_ENV;
  else process.env.APP_ENV = originalEnvironment;
});

describe("proxy security policy", () => {
  it("adds a unique script nonce for Next rendering", () => {
    const response = proxy(new NextRequest("https://hire.example.com/login"));
    const policy = response.headers.get("content-security-policy");

    expect(policy).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(policy).toContain("object-src 'none'");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });

  it("keeps security headers on rejected cross-site mutations", () => {
    const response = proxy(
      new NextRequest("https://hire.example.com/api/organizations", {
        method: "POST",
        headers: {
          origin: "https://foreign.example",
          "sec-fetch-site": "cross-site",
        },
      }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
  });

  it("enables transport hardening in production", () => {
    process.env.APP_ENV = "production";
    const response = proxy(new NextRequest("https://hire.example.com/login"));
    expect(response.headers.get("strict-transport-security")).toContain("max-age=31536000");
    expect(response.headers.get("content-security-policy")).toContain("upgrade-insecure-requests");
  });
});
