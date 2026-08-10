import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyEmailToken } from "@/features/auth/email-verification";
import { logger } from "@/lib/logger";
import { POST } from "./route";

vi.mock("@/features/auth/email-verification", () => ({
  verifyEmailToken: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

const mockedVerifyEmailToken = vi.mocked(verifyEmailToken);
const mockedLogger = vi.mocked(logger);

describe("POST /api/auth/verify-email", () => {
  beforeEach(() => vi.clearAllMocks());

  it("verifies a valid token", async () => {
    mockedVerifyEmailToken.mockResolvedValue(true);

    const response = await POST(
      new Request("http://localhost/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token: "verification-token" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "verified" });
  });

  it("rejects an invalid or expired token", async () => {
    mockedVerifyEmailToken.mockResolvedValue(false);

    const response = await POST(
      new Request("http://localhost/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token: "expired-token" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects a missing token", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
    expect(mockedVerifyEmailToken).not.toHaveBeenCalled();
  });

  it("hides verification failures", async () => {
    mockedVerifyEmailToken.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(
      new Request("http://localhost/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token: "verification-token" }),
      }),
    );

    expect(response.status).toBe(500);
    expect(mockedLogger.error).toHaveBeenCalledWith(
      "Email verification failed",
      expect.any(Error),
    );
  });
});
