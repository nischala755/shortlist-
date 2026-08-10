import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import {
  canAccessOrganization,
  listOrganizationMembers,
} from "@/features/organizations/access";
import { GET } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/organizations/access", () => ({
  canAccessOrganization: vi.fn(),
  getOrganizationForUser: vi.fn(),
  listOrganizationMembers: vi.fn(),
}));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedCanAccessOrganization = vi.mocked(canAccessOrganization);
const mockedListOrganizationMembers = vi.mocked(listOrganizationMembers);

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
});
