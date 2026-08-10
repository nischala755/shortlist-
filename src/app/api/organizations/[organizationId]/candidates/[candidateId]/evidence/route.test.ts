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
const params = { organizationId: "o-1", candidateId: "c-1" };

describe("candidate evidence collection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists evidence for a candidate without crossing organization scope", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
    const findMany = vi.fn().mockResolvedValue([{ id: "e-1", title: "TypeScript" }]);
    mockedGetPrisma.mockReturnValue({ candidate: { findFirst: vi.fn().mockResolvedValue({ id: "c-1" }) }, candidateEvidence: { findMany } } as never);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve(params) });

    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "o-1", candidateId: "c-1" } }));
  });

  it("rejects evidence linked to a requirement outside the organization", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
    const create = vi.fn();
    mockedGetPrisma.mockReturnValue({
      candidate: { findFirst: vi.fn().mockResolvedValue({ id: "c-1" }) },
      jobRequirement: { findFirst: vi.fn().mockResolvedValue(null) },
      candidateEvidence: { create },
    } as never);

    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ title: "Skill", details: "Observed", sourceType: "MANUAL", jobRequirementId: "req-other" }) }), { params: Promise.resolve(params) });

    expect(response.status).toBe(404);
    expect(create).not.toHaveBeenCalled();
  });
});
