import { beforeEach, describe, expect, it, vi } from "vitest";
import { revokeSession } from "@/features/auth/session";
import { logger } from "@/lib/logger";
import { POST } from "./route";

vi.mock("@/features/auth/session", () => ({
  revokeSession: vi.fn(),
  sessionCookieName: "evidencehire_session",
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

const mockedRevokeSession = vi.mocked(revokeSession);
const mockedLogger = vi.mocked(logger);

describe("POST /api/auth/logout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("revokes the session and clears the cookie", async () => {
    mockedRevokeSession.mockResolvedValue(undefined);

    const response = await POST(
      new Request("http://localhost/api/auth/logout", {
        headers: { cookie: "evidencehire_session=session-token" },
      }),
    );

    expect(response.status).toBe(204);
    expect(mockedRevokeSession).toHaveBeenCalledOnce();
    expect(response.headers.get("set-cookie")).toContain(
      "evidencehire_session=",
    );
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("is safe to call without a session cookie", async () => {
    mockedRevokeSession.mockResolvedValue(undefined);

    const response = await POST(new Request("http://localhost/api/auth/logout"));

    expect(response.status).toBe(204);
    expect(mockedRevokeSession).toHaveBeenCalledOnce();
  });

  it("hides revocation failures", async () => {
    mockedRevokeSession.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(new Request("http://localhost/api/auth/logout"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Unable to log out" });
    expect(mockedLogger.error).toHaveBeenCalledWith(
      "User logout failed",
      expect.any(Error),
    );
  });
});
