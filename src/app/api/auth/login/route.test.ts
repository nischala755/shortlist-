import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { verifyPassword } from "@/features/auth/password";
import { createSession } from "@/features/auth/session";
import { POST } from "./route";

vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/features/auth/password", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/auth/password")>();

  return {
    ...actual,
    verifyPassword: vi.fn(),
  };
});
vi.mock("@/features/auth/session", () => ({
  createSession: vi.fn(),
  sessionCookieName: "evidencehire_session",
  sessionLifetimeSeconds: 2_592_000,
}));

const mockedGetPrisma = vi.mocked(getPrisma);
const mockedLogger = vi.mocked(logger);
const mockedVerifyPassword = vi.mocked(verifyPassword);
const mockedCreateSession = vi.mocked(createSession);

function requestWithBody(body: unknown) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a secure session for valid credentials", async () => {
    mockedGetPrisma.mockReturnValue({
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "user-1",
          email: "recruiter@example.com",
          passwordHash: "stored-hash",
        }),
      },
    } as never);
    mockedVerifyPassword.mockResolvedValue(true);
    mockedCreateSession.mockResolvedValue({
      token: "session-token",
      expiresAt: new Date("2026-09-09T00:00:00.000Z"),
    });

    const response = await POST(
      requestWithBody({
        email: " Recruiter@Example.COM ",
        password: "correct horse battery staple",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user: { id: "user-1", email: "recruiter@example.com" },
    });
    expect(response.headers.get("set-cookie")).toContain(
      "evidencehire_session=session-token",
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
    expect(mockedCreateSession).toHaveBeenCalledWith("user-1");
  });

  it("does not reveal whether an email exists", async () => {
    mockedGetPrisma.mockReturnValue({
      user: { findUnique: vi.fn().mockResolvedValue(null) },
    } as never);

    const response = await POST(
      requestWithBody({
        email: "missing@example.com",
        password: "correct horse battery staple",
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid email or password",
    });
    expect(mockedCreateSession).not.toHaveBeenCalled();
  });

  it("rejects an incorrect password with the same public error", async () => {
    mockedGetPrisma.mockReturnValue({
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "user-1",
          email: "recruiter@example.com",
          passwordHash: "stored-hash",
        }),
      },
    } as never);
    mockedVerifyPassword.mockResolvedValue(false);

    const response = await POST(
      requestWithBody({
        email: "recruiter@example.com",
        password: "wrong password here",
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid email or password",
    });
  });

  it("hides persistence failures", async () => {
    mockedGetPrisma.mockReturnValue({
      user: { findUnique: vi.fn().mockRejectedValue(new Error("database down")) },
    } as never);

    const response = await POST(
      requestWithBody({
        email: "recruiter@example.com",
        password: "correct horse battery staple",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Unable to log in" });
    expect(mockedLogger.error).toHaveBeenCalledWith(
      "User login failed",
      expect.any(Error),
    );
  });
});
