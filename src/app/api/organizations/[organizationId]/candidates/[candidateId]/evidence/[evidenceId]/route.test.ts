import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";
import { DELETE, GET, PATCH } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/organizations/access", () => ({ canAccessOrganization: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedCanAccess = vi.mocked(canAccessOrganization);
const mockedGetPrisma = vi.mocked(getPrisma);
const params = { organizationId: "o-1", candidateId: "c-1", evidenceId: "e-1" };

describe("candidate evidence item", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
  });

  it("returns a scoped evidence item", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "e-1", title: "TypeScript" });
    mockedGetPrisma.mockReturnValue({ candidateEvidence: { findFirst } } as never);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve(params) });

    expect(response.status).toBe(200);
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "e-1", organizationId: "o-1", candidateId: "c-1" } }));
  });

  it("updates an existing scoped evidence item", async () => {
    const update = vi.fn().mockResolvedValue({ id: "e-1", title: "Updated" });
    mockedGetPrisma.mockReturnValue({ candidateEvidence: { findFirst: vi.fn().mockResolvedValue({ id: "e-1" }), update } } as never);

    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ title: "Updated", details: "Observed", sourceType: "INTERVIEW" }) }), { params: Promise.resolve(params) });

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "e-1" }, data: expect.objectContaining({ sourceType: "INTERVIEW" }) }));
  });

  it("scopes a replacement requirement to a job the candidate applied for", async () => {
    const requirementLookup = vi.fn().mockResolvedValue({ id: "req-1" });
    const update = vi.fn().mockResolvedValue({ id: "e-1" });
    mockedGetPrisma.mockReturnValue({ candidateEvidence: { findFirst: vi.fn().mockResolvedValue({ id: "e-1" }), update }, jobRequirement: { findFirst: requirementLookup } } as never);

    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ title: "Updated", details: "Observed", sourceType: "MANUAL", jobRequirementId: "req-1" }) }), { params: Promise.resolve(params) });

    expect(response.status).toBe(200);
    expect(requirementLookup).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "req-1", job: { organizationId: "o-1", applications: { some: { candidateId: "c-1" } } } },
    }));
  });

  it("deletes only an existing scoped evidence item", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    mockedGetPrisma.mockReturnValue({ candidateEvidence: { deleteMany } } as never);

    const response = await DELETE(new Request("http://localhost", { method: "DELETE" }), { params: Promise.resolve(params) });

    expect(response.status).toBe(204);
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: "e-1", organizationId: "o-1", candidateId: "c-1" } });
  });
});
