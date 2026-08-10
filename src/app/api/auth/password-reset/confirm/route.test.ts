import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetPassword } from "@/features/auth/password-reset";
import { PasswordValidationError } from "@/features/auth/password";
import { logger } from "@/lib/logger";
import { POST } from "./route";

vi.mock("@/features/auth/password-reset", () => ({ resetPassword: vi.fn() }));
vi.mock("@/features/auth/password", () => ({
  PasswordValidationError: class PasswordValidationError extends Error {},
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

const mockedResetPassword = vi.mocked(resetPassword);
const mockedLogger = vi.mocked(logger);

describe("POST /api/auth/password-reset/confirm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("confirms a valid reset", async () => {
    mockedResetPassword.mockResolvedValue(true);

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ token: "reset-token", password: "new secure password" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "password_reset" });
  });

  it("rejects invalid or expired reset tokens", async () => {
    mockedResetPassword.mockResolvedValue(false);

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ token: "expired", password: "new secure password" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns password validation errors", async () => {
    mockedResetPassword.mockRejectedValue(
      new PasswordValidationError("Password must be at least 12 characters"),
    );

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ token: "reset-token", password: "short" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("hides persistence failures", async () => {
    mockedResetPassword.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ token: "reset-token", password: "new secure password" }),
      }),
    );

    expect(response.status).toBe(500);
    expect(mockedLogger.error).toHaveBeenCalled();
  });
});
