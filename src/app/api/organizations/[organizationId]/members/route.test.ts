import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import {
  canAccessOrganization,
  listOrganizationMembers,
} from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";
import { GET, POST } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/organizations/access", () => ({
  canAccessOrganization: vi.fn(),
  getOrganizationForUser: vi.fn(),
  listOrganizationMembers: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedCanAccessOrganization = vi.mocked(canAccessOrganization);
const mockedListOrganizationMembers = vi.mocked(listOrganizationMembers);
const mockedGetPrisma = vi.mocked(getPrisma);

describe("GET /api/organizations/:organizationId/members", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns members for an accessible organization", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "user-1", email: "a@example.com" });
    mockedCanAccessOrganization.mockResolvedValue({
      membership: { id: "membership-1", role: "ADMIN" },
      allowed: true,
    });
    mockedListOrganizationMembers.mockResolvedValue([]);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ organizationId: "org-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ members: [] });
  });

  it("denies members from an inaccessible organization", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "user-1", email: "a@example.com" });
    mockedCanAccessOrganization.mockResolvedValue({ membership: null, allowed: false });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ organizationId: "other-org" }),
    });

    expect(response.status).toBe(404);
    expect(mockedListOrganizationMembers).not.toHaveBeenCalled();
  });

  it("adds an existing verified user with an explicit role", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "admin-1", email: "admin@example.com" });
    mockedCanAccessOrganization.mockResolvedValue({ membership: { id: "m-1", role: "ADMIN" }, allowed: true });
    const create = vi.fn().mockResolvedValue({ id: "m-2", role: "INTERVIEWER" });
    mockedGetPrisma.mockReturnValue({ user: { findUnique: vi.fn().mockResolvedValue({ id: "u-2", email: "member@example.com", emailVerifiedAt: new Date() }) }, membership: { create } } as never);

    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ email: " MEMBER@example.com ", role: "INTERVIEWER" }) }), { params: Promise.resolve({ organizationId: "org-1" }) });

    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: { organizationId: "org-1", userId: "u-2", role: "INTERVIEWER" } }));
  });

  it("does not add an unverified user", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "admin-1", email: "admin@example.com" });
    mockedCanAccessOrganization.mockResolvedValue({ membership: { id: "m-1", role: "ADMIN" }, allowed: true });
    const create = vi.fn();
    mockedGetPrisma.mockReturnValue({ user: { findUnique: vi.fn().mockResolvedValue({ id: "u-2", email: "member@example.com", emailVerifiedAt: null }) }, membership: { create } } as never);

    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ email: "member@example.com", role: "RECRUITER" }) }), { params: Promise.resolve({ organizationId: "org-1" }) });

    expect(response.status).toBe(404);
    expect(create).not.toHaveBeenCalled();
  });
});
