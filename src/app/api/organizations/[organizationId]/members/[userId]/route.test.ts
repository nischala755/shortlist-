import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";
import { PATCH } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/organizations/access", () => ({ canAccessOrganization: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedCanAccessOrganization = vi.mocked(canAccessOrganization);
const mockedGetPrisma = vi.mocked(getPrisma);

describe("PATCH /api/organizations/:organizationId/members/:userId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows a member manager to update a role", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "admin-1", email: "a@example.com" });
    mockedCanAccessOrganization.mockResolvedValue({
      membership: { id: "membership-1", role: "ADMIN" },
      allowed: true,
    });
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    mockedGetPrisma.mockReturnValue({ membership: { findUnique: vi.fn().mockResolvedValue({ role: "INTERVIEWER" }), updateMany } } as never);

    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ role: "RECRUITER" }),
      }),
      { params: Promise.resolve({ organizationId: "org-1", userId: "user-2" }) },
    );

    expect(response.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1", userId: "user-2" },
      data: { role: "RECRUITER" },
    });
  });

  it("rejects role changes without permission", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "interviewer-1", email: "i@example.com" });
    mockedCanAccessOrganization.mockResolvedValue({
      membership: { id: "membership-1", role: "INTERVIEWER" },
      allowed: false,
    });

    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ role: "ADMIN" }),
      }),
      { params: Promise.resolve({ organizationId: "org-1", userId: "user-2" }) },
    );

    expect(response.status).toBe(403);
    expect(mockedGetPrisma).not.toHaveBeenCalled();
  });

  it("rejects invalid roles", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "admin-1", email: "a@example.com" });
    mockedCanAccessOrganization.mockResolvedValue({
      membership: { id: "membership-1", role: "ADMIN" },
      allowed: true,
    });

    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ role: "OWNER" }),
      }),
      { params: Promise.resolve({ organizationId: "org-1", userId: "user-2" }) },
    );

    expect(response.status).toBe(400);
  });

  it("prevents demoting the final admin", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "admin-1", email: "a@example.com" });
    mockedCanAccessOrganization.mockResolvedValue({ membership: { id: "membership-1", role: "ADMIN" }, allowed: true });
    const updateMany = vi.fn();
    mockedGetPrisma.mockReturnValue({ membership: { findUnique: vi.fn().mockResolvedValue({ role: "ADMIN" }), count: vi.fn().mockResolvedValue(1), updateMany } } as never);

    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ role: "RECRUITER" }) }), { params: Promise.resolve({ organizationId: "org-1", userId: "admin-1" }) });

    expect(response.status).toBe(409);
    expect(updateMany).not.toHaveBeenCalled();
  });
});
