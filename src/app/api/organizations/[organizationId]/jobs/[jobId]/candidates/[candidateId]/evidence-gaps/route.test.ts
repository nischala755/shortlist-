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

describe("evidence gaps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
  });

  it("returns a scoped coverage report", async () => {
    mockedGetPrisma.mockReturnValue({
      job: { findFirst: vi.fn().mockResolvedValue({ id: "j-1", title: "Engineer" }) },
      candidate: { findFirst: vi.fn().mockResolvedValue({ id: "c-1", name: "Ada", email: "ada@example.com" }) },
      jobRequirement: { findMany: vi.fn().mockResolvedValue([{ id: "r-1", title: "TypeScript", description: "Strong TypeScript" }, { id: "r-2", title: "Testing", description: "Writes tests" }]) },
      candidateEvidence: { findMany: vi.fn().mockResolvedValue([{ id: "e-1", jobRequirementId: "r-1" }]) },
    } as never);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve(params) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.report.summary.coveragePercent).toBe(50);
    expect(body.report.gaps[0].id).toBe("r-2");
  });
});
