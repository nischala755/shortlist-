import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import { getOrganizationForUser } from "@/features/organizations/access";
import { GET } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/organizations/access", () => ({
  getOrganizationForUser: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedGetOrganizationForUser = vi.mocked(getOrganizationForUser);

describe("GET /api/organizations/:organizationId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an organization the user belongs to", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "user-1", email: "a@example.com" });
    mockedGetOrganizationForUser.mockResolvedValue({
      id: "org-1",
      name: "Acme",
      createdAt: new Date("2026-08-10T00:00:00.000Z"),
    });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ organizationId: "org-1" }),
    });

    expect(response.status).toBe(200);
  });

  it("returns not found for another tenant", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "user-1", email: "a@example.com" });
    mockedGetOrganizationForUser.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ organizationId: "other-org" }),
    });

    expect(response.status).toBe(404);
  });
});
