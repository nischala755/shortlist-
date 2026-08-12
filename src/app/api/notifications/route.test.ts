import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import { getPrisma } from "@/lib/db";
import { GET, PATCH } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));
const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedGetPrisma = vi.mocked(getPrisma);

describe("notifications route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists only the current user's unread notifications when requested", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    const findMany = vi.fn().mockResolvedValue([]);
    mockedGetPrisma.mockReturnValue({ notification: { findMany, count: vi.fn().mockResolvedValue(0) } } as never);
    const response = await GET(new Request("http://localhost/api/notifications?organizationId=o-1&unread=true"));
    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u-1", organizationId: "o-1", readAt: null } }));
  });

  it("marks only the current user's unread organization notifications as read", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    const updateMany = vi.fn().mockResolvedValue({ count: 3 });
    mockedGetPrisma.mockReturnValue({ notification: { updateMany } } as never);
    const response = await PATCH(new Request("http://localhost/api/notifications", { method: "PATCH", body: JSON.stringify({ organizationId: "o-1" }) }));
    expect(response.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u-1", organizationId: "o-1", readAt: null } }));
  });
});
