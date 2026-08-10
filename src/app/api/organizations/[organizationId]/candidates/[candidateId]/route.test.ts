import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";
import { Role } from "@/generated/prisma/client";
import { GET, PATCH } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/organizations/access", () => ({ canAccessOrganization: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));

const user = { id: "u-1", email: "r@example.com" };
const access = { membership: { id: "m-1", role: Role.RECRUITER }, allowed: true };
const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedCanAccess = vi.mocked(canAccessOrganization);
const mockedGetPrisma = vi.mocked(getPrisma);

describe("/api/organizations/:organizationId/candidates/:candidateId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a candidate scoped to the organization", async () => {
    mockedGetCurrentUser.mockResolvedValue(user);
    mockedCanAccess.mockResolvedValue(access);
    const findFirst = vi.fn().mockResolvedValue({ id: "c-1", name: "Ada", email: "ada@example.com" });
    mockedGetPrisma.mockReturnValue({ candidate: { findFirst } } as never);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ organizationId: "o-1", candidateId: "c-1" }) });

    expect(response.status).toBe(200);
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "c-1", organizationId: "o-1" } }));
  });

  it("does not expose a candidate from another organization", async () => {
    mockedGetCurrentUser.mockResolvedValue(user);
    mockedCanAccess.mockResolvedValue(access);
    mockedGetPrisma.mockReturnValue({ candidate: { findFirst: vi.fn().mockResolvedValue(null) } } as never);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ organizationId: "o-1", candidateId: "other" }) });

    expect(response.status).toBe(404);
  });

  it("updates a candidate for a manager", async () => {
    mockedGetCurrentUser.mockResolvedValue(user);
    mockedCanAccess.mockResolvedValue(access);
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findFirst = vi.fn().mockResolvedValue({ id: "c-1", name: "Ada Updated", email: "ada@example.com" });
    mockedGetPrisma.mockReturnValue({ candidate: { updateMany, findFirst } } as never);

    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ name: "Ada Updated", email: "ada@example.com" }) }), { params: Promise.resolve({ organizationId: "o-1", candidateId: "c-1" }) });

    expect(response.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "c-1", organizationId: "o-1" } }));
  });
});
