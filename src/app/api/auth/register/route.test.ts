import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { POST } from "./route";

vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
}));

const mockedGetPrisma = vi.mocked(getPrisma);
const mockedLogger = vi.mocked(logger);

function requestWithBody(body: unknown) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a user without storing the raw password", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "user-1",
      email: "recruiter@example.com",
    });
    mockedGetPrisma.mockReturnValue({ user: { create } } as never);

    const response = await POST(
      requestWithBody({
        email: " Recruiter@Example.COM ",
        password: "correct horse battery staple",
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      user: { id: "user-1", email: "recruiter@example.com" },
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          email: "recruiter@example.com",
          passwordHash: expect.stringMatching(/^scrypt\$/),
        },
      }),
    );
    expect(JSON.stringify(create.mock.calls)).not.toContain(
      "correct horse battery staple",
    );
  });

  it("rejects invalid JSON", async () => {
    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: "not-json",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mockedGetPrisma).not.toHaveBeenCalled();
  });

  it("rejects invalid registration data", async () => {
    const response = await POST(
      requestWithBody({ email: "not-an-email", password: "short" }),
    );

    expect(response.status).toBe(400);
    expect(mockedGetPrisma).not.toHaveBeenCalled();
  });

  it("returns conflict for a duplicate email", async () => {
    const create = vi.fn().mockRejectedValue({ code: "P2002" });
    mockedGetPrisma.mockReturnValue({ user: { create } } as never);

    const response = await POST(
      requestWithBody({
        email: "recruiter@example.com",
        password: "correct horse battery staple",
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "An account with that email already exists",
    });
    expect(mockedLogger.error).not.toHaveBeenCalled();
  });

  it("hides unexpected persistence failures", async () => {
    const create = vi.fn().mockRejectedValue(new Error("database unavailable"));
    mockedGetPrisma.mockReturnValue({ user: { create } } as never);

    const response = await POST(
      requestWithBody({
        email: "recruiter@example.com",
        password: "correct horse battery staple",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to create account",
    });
    expect(mockedLogger.error).toHaveBeenCalledWith(
      "User registration failed",
      expect.any(Error),
    );
  });
});
