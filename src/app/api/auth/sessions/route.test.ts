import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser, listUserSessions } from "@/features/auth/session";
import { GET } from "./route";

vi.mock("@/features/auth/session", () => ({
  getCurrentUser: vi.fn(),
  listUserSessions: vi.fn(),
}));
const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedListUserSessions = vi.mocked(listUserSessions);

describe("GET /api/auth/sessions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists only the authenticated user's sessions", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "user-1", email: "a@example.com" });
    mockedListUserSessions.mockResolvedValue([
      {
        id: "session-1",
        createdAt: new Date("2026-08-10T00:00:00.000Z"),
        lastUsedAt: new Date("2026-08-10T00:00:00.000Z"),
        expiresAt: new Date("2026-09-10T00:00:00.000Z"),
        userAgent: "Browser",
      },
    ]);

    const response = await GET(new Request("http://localhost/api/auth/sessions"));

    expect(response.status).toBe(200);
    expect(mockedListUserSessions).toHaveBeenCalledWith("user-1");
    await expect(response.json()).resolves.toHaveProperty("sessions");
  });

  it("requires authentication", async () => {
    mockedGetCurrentUser.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/auth/sessions"));

    expect(response.status).toBe(401);
    expect(mockedListUserSessions).not.toHaveBeenCalled();
  });
});
