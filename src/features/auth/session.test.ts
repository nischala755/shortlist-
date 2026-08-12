import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPrisma } from "@/lib/db";
import { getCurrentSession, getSessionToken } from "./session";

vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));

const mockedGetPrisma = vi.mocked(getPrisma);

describe("getSessionToken", () => {
  beforeEach(() => vi.clearAllMocks());
  it("reads the session cookie", () => {
    const request = new Request("http://localhost", {
      headers: {
        cookie: "theme=dark; evidencehire_session=session-token",
      },
    });

    expect(getSessionToken(request)).toBe("session-token");
  });

  it("returns null when the session cookie is absent", () => {
    expect(getSessionToken(new Request("http://localhost"))).toBeNull();
  });

  it("does not authenticate an unverified account", async () => {
    const update = vi.fn();
    mockedGetPrisma.mockReturnValue({
      session: {
        findUnique: vi.fn().mockResolvedValue({
          id: "session-1",
          expiresAt: new Date(Date.now() + 60_000),
          user: { id: "user-1", email: "user@example.com", emailVerifiedAt: null },
        }),
        update,
      },
    } as never);

    const session = await getCurrentSession(new Request("http://localhost", {
      headers: { cookie: "evidencehire_session=session-token" },
    }));

    expect(session).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });
});
