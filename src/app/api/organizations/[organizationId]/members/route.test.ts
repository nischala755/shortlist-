import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import {
  getOrganizationForUser,
  listOrganizationMembers,
} from "@/features/organizations/access";
import { GET } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/organizations/access", () => ({
  getOrganizationForUser: vi.fn(),
  listOrganizationMembers: vi.fn(),
}));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedGetOrganizationForUser = vi.mocked(getOrganizationForUser);
const mockedListOrganizationMembers = vi.mocked(listOrganizationMembers);

describe("GET /api/organizations/:organizationId/members", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns members for an accessible organization", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "user-1", email: "a@example.com" });
    mockedGetOrganizationForUser.mockResolvedValue({
      id: "org-1",
      name: "Acme",
      createdAt: new Date("2026-08-10T00:00:00.000Z"),
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
    mockedGetOrganizationForUser.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ organizationId: "other-org" }),
    });

    expect(response.status).toBe(404);
    expect(mockedListOrganizationMembers).not.toHaveBeenCalled();
  });
});
