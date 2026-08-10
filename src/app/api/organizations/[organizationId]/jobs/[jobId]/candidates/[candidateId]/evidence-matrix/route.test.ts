import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";
import { GET } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/organizations/access", () => ({ canAccessOrganization: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedCanAccess = vi.mocked(canAccessOrganization);
const mockedGetPrisma = vi.mocked(getPrisma);
const params = { organizationId: "o-1", jobId: "j-1", candidateId: "c-1" };

describe("candidate evidence matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
  });

  it("groups scoped evidence under matching job requirements", async () => {
    mockedGetPrisma.mockReturnValue({
      job: { findFirst: vi.fn().mockResolvedValue({ id: "j-1", title: "Engineer" }) },
      candidate: { findFirst: vi.fn().mockResolvedValue({ id: "c-1", name: "Ada", email: "ada@example.com" }) },
      jobRequirement: { findMany: vi.fn().mockResolvedValue([{ id: "req-1", title: "TypeScript", description: "Strong TypeScript" }]) },
      candidateEvidence: {
        findMany: vi.fn()
          .mockResolvedValueOnce([{ id: "e-1", jobRequirementId: "req-1", title: "Project", details: "Built a TS service" }])
          .mockResolvedValueOnce([{ id: "e-2", title: "Portfolio", details: "Public work" }]),
      },
    } as never);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve(params) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.matrix.requirements[0].evidence[0].id).toBe("e-1");
    expect(body.matrix.unlinkedEvidence[0].id).toBe("e-2");
  });

  it("does not reveal a job or candidate from another organization", async () => {
    mockedGetPrisma.mockReturnValue({
      job: { findFirst: vi.fn().mockResolvedValue(null) },
      candidate: { findFirst: vi.fn().mockResolvedValue({ id: "c-1" }) },
    } as never);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve(params) });

    expect(response.status).toBe(404);
  });
});
