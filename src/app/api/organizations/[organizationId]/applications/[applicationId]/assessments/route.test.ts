import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";
import { GET, POST } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/organizations/access", () => ({ canAccessOrganization: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));
const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedCanAccess = vi.mocked(canAccessOrganization);
const mockedGetPrisma = vi.mocked(getPrisma);
const params = { organizationId: "o-1", applicationId: "a-1" };

describe("application coding assessments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
  });

  it("creates a draft assessment for a scoped application", async () => {
    const create = vi.fn().mockResolvedValue({ id: "a-1", status: "DRAFT" });
    mockedGetPrisma.mockReturnValue({ application: { findFirst: vi.fn().mockResolvedValue({ id: "a-1" }) }, codingAssessment: { create } } as never);
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ title: "Task", instructions: "Solve it", durationMinutes: 60 }) }), { params: Promise.resolve(params) });
    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId: "o-1", applicationId: "a-1" }) }));
  });

  it("lists assessments only after application scope is verified", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    mockedGetPrisma.mockReturnValue({ application: { findFirst: vi.fn().mockResolvedValue({ id: "a-1" }) }, codingAssessment: { findMany } } as never);
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve(params) });
    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "o-1", applicationId: "a-1" } }));
  });
});
