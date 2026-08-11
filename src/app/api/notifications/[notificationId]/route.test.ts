import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import { getPrisma } from "@/lib/db";
import { PATCH } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));
const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedGetPrisma = vi.mocked(getPrisma);

describe("notification item route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
  });

  it("marks only the user's own notification as read", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    mockedGetPrisma.mockReturnValue({ notification: { updateMany } } as never);
    const response = await PATCH(new Request("http://localhost", { method: "PATCH" }), { params: Promise.resolve({ notificationId: "n-1" }) });
    expect(response.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "n-1", userId: "u-1" } }));
  });
});
