import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { GET, POST } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedGetPrisma = vi.mocked(getPrisma);
const mockedLogger = vi.mocked(logger);

function requestWithBody(body: unknown) {
  return new Request("http://localhost/api/organizations", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("/api/organizations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires authentication for creation and listing", async () => {
    mockedGetCurrentUser.mockResolvedValue(null);

    expect((await POST(requestWithBody({ name: "Acme Hiring" }))).status).toBe(401);
    expect((await GET(new Request("http://localhost/api/organizations"))).status).toBe(401);
  });

  it("creates an organization and membership together", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "user-1", email: "a@example.com" });
    const transaction = {
      organization: {
        create: vi.fn().mockResolvedValue({
          id: "org-1",
          name: "Acme Hiring",
          createdAt: new Date("2026-08-10T00:00:00.000Z"),
        }),
      },
      membership: { create: vi.fn().mockResolvedValue({}) },
    };
    mockedGetPrisma.mockReturnValue({
      $transaction: vi.fn(async (callback) => callback(transaction)),
    } as never);

    const response = await POST(requestWithBody({ name: " Acme Hiring " }));

    expect(response.status).toBe(201);
    expect(transaction.membership.create).toHaveBeenCalledWith({
      data: { organizationId: "org-1", userId: "user-1" },
    });
  });

  it("lists only memberships for the current user", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "user-1", email: "a@example.com" });
    const findMany = vi.fn().mockResolvedValue([]);
    mockedGetPrisma.mockReturnValue({ organization: { findMany } } as never);

    const response = await GET(new Request("http://localhost/api/organizations"));

    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { memberships: { some: { userId: "user-1" } } },
      }),
    );
  });

  it("hides persistence failures", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "user-1", email: "a@example.com" });
    mockedGetPrisma.mockReturnValue({
      organization: { findMany: vi.fn().mockRejectedValue(new Error("database down")) },
    } as never);

    const response = await GET(new Request("http://localhost/api/organizations"));

    expect(response.status).toBe(500);
    expect(mockedLogger.error).toHaveBeenCalled();
  });
});
