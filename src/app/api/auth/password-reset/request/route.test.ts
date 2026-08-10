import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPasswordResetToken } from "@/features/auth/password-reset";
import { POST } from "./route";

vi.mock("@/features/auth/password-reset", () => ({
  createPasswordResetToken: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

const mockedCreatePasswordResetToken = vi.mocked(createPasswordResetToken);

describe("POST /api/auth/password-reset/request", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the same accepted response for an existing account", async () => {
    mockedCreatePasswordResetToken.mockResolvedValue(undefined);

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      }),
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ status: "accepted" });
    expect(mockedCreatePasswordResetToken).toHaveBeenCalledWith("user@example.com");
  });

  it("rejects a missing email", async () => {
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
    expect(mockedCreatePasswordResetToken).not.toHaveBeenCalled();
  });
});
