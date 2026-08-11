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

describe("organization analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
  });

  it("returns organization-scoped counts and distributions", async () => {
    mockedGetPrisma.mockReturnValue({
      job: { findMany: vi.fn().mockResolvedValue([{ status: "DRAFT" }, { status: "DRAFT" }]) },
      candidate: { count: vi.fn().mockResolvedValue(3) },
      application: { findMany: vi.fn().mockResolvedValue([{ currentStage: "APPLIED" }]) },
      interview: { findMany: vi.fn().mockResolvedValue([{ status: "SCHEDULED" }]) },
      offer: { findMany: vi.fn().mockResolvedValue([{ status: "SENT" }]) },
      resume: { count: vi.fn().mockResolvedValue(2) },
      candidateEvidence: { count: vi.fn().mockResolvedValue(4) },
      codingAssessment: { findMany: vi.fn().mockResolvedValue([{ status: "ASSIGNED" }]) },
    } as never);
    const response = await GET(new Request("http://localhost/api/organizations/o-1/analytics?from=2026-01-01&to=2026-01-31"), { params: Promise.resolve({ organizationId: "o-1" }) });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.jobs).toEqual({ total: 2, byStatus: { DRAFT: 2 } });
    expect(body.applications.byStage.APPLIED).toBe(1);
  });

  it("rejects an invalid date range", async () => {
    mockedGetPrisma.mockReturnValue({} as never);
    const response = await GET(new Request("http://localhost/api/organizations/o-1/analytics?from=bad"), { params: Promise.resolve({ organizationId: "o-1" }) });
    expect(response.status).toBe(400);
  });
});
