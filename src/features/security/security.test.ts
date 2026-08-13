import { beforeEach, describe, expect, it } from "vitest";
import { productionConfigurationErrors } from "./config";
import { consumeRateLimit, resetRateLimits } from "./rate-limit";
import { isTrustedMutation } from "./request";

describe("security controls", () => {
  beforeEach(resetRateLimits);

  it("rejects foreign-origin browser mutations", () =>
    expect(
      isTrustedMutation(
        new Request("https://app.test/api/x", {
          method: "POST",
          headers: {
            host: "app.test",
            origin: "https://evil.test",
            "sec-fetch-site": "cross-site",
          },
        }),
      ),
    ).toBe(false));

  it("allows same-origin mutations", () =>
    expect(
      isTrustedMutation(
        new Request("https://app.test/api/x", {
          method: "POST",
          headers: { host: "app.test", origin: "https://app.test" },
        }),
      ),
    ).toBe(true));

  it("limits repeated attempts", () => {
    expect(consumeRateLimit("login", 1, 1000, 0).allowed).toBe(true);
    expect(consumeRateLimit("login", 1, 1000, 1).allowed).toBe(false);
  });

  it("requires the complete production service configuration", () => {
    expect(
      productionConfigurationErrors({
        APP_ENV: "production",
        APP_URL: "http://app.test",
        DATABASE_URL: "sqlite:test",
        RESUME_STORAGE_DRIVER: "local",
        EMAIL_PROVIDER: "console",
      }),
    ).toHaveLength(7);

    expect(
      productionConfigurationErrors({
        APP_ENV: "production",
        APP_URL: "https://app.test",
        DATABASE_URL: "postgresql://db/app",
        RESUME_STORAGE_DRIVER: "s3",
        S3_BUCKET: "resumes",
        EMAIL_PROVIDER: "resend",
        EMAIL_FROM: "EvidenceHire <noreply@app.test>",
        RESEND_API_KEY: "test-key",
      }),
    ).toEqual([]);

    expect(
      productionConfigurationErrors({
        APP_ENV: "production",
        RENDER_EXTERNAL_URL: "https://evidencehire.onrender.com",
        DATABASE_URL: "postgresql://db/app",
        RESUME_STORAGE_DRIVER: "s3",
        S3_BUCKET: "resumes",
        EMAIL_PROVIDER: "resend",
        EMAIL_FROM: "EvidenceHire <noreply@app.test>",
        RESEND_API_KEY: "test-key",
      }),
    ).toEqual([]);
  });
});
