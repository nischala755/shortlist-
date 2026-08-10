import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser, revokeUserSession } from "@/features/auth/session";
import { DELETE } from "./route";

vi.mock("@/features/auth/session", () => ({
  getCurrentUser: vi.fn(),
  revokeUserSession: vi.fn(),
}));
const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedRevokeUserSession = vi.mocked(revokeUserSession);

describe("DELETE /api/auth/sessions/:sessionId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("revokes a session belonging to the current user", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "user-1", email: "a@example.com" });
    mockedRevokeUserSession.mockResolvedValue({ count: 1 });

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });

    expect(response.status).toBe(204);
    expect(mockedRevokeUserSession).toHaveBeenCalledWith("user-1", "session-1");
  });

  it("does not reveal sessions from another user", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "user-1", email: "a@example.com" });
    mockedRevokeUserSession.mockResolvedValue({ count: 0 });

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ sessionId: "other-session" }),
    });

    expect(response.status).toBe(404);
  });

  it("requires authentication", async () => {
    mockedGetCurrentUser.mockResolvedValue(null);

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });

    expect(response.status).toBe(401);
    expect(mockedRevokeUserSession).not.toHaveBeenCalled();
  });
});
