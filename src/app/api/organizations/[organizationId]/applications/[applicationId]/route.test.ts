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

describe("GET application detail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns stage history for a scoped application", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
    mockedGetPrisma.mockReturnValue({ application: { findFirst: vi.fn().mockResolvedValue({ id: "a-1", currentStage: "SCREENING", stageHistory: [] }) } } as never);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ organizationId: "o-1", applicationId: "a-1" }) });

    expect(response.status).toBe(200);
  });

  it("does not expose an application from another organization", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
    mockedGetPrisma.mockReturnValue({ application: { findFirst: vi.fn().mockResolvedValue(null) } } as never);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ organizationId: "o-1", applicationId: "other" }) });

    expect(response.status).toBe(404);
  });
});
