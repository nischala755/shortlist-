import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import { logger } from "@/lib/logger";
import { GET } from "./route";

vi.mock("@/features/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedLogger = vi.mocked(logger);

describe("GET /api/auth/me", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the authenticated user", async () => {
    mockedGetCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "recruiter@example.com",
    });

    const response = await GET(new Request("http://localhost/api/auth/me"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user: { id: "user-1", email: "recruiter@example.com" },
    });
  });

  it("returns unauthorized when there is no valid session", async () => {
    mockedGetCurrentUser.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/auth/me"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required",
    });
  });

  it("hides session lookup failures", async () => {
    mockedGetCurrentUser.mockRejectedValue(new Error("database unavailable"));

    const response = await GET(new Request("http://localhost/api/auth/me"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to verify session",
    });
    expect(mockedLogger.error).toHaveBeenCalledWith(
      "Authenticated user lookup failed",
      expect.any(Error),
    );
  });
});
