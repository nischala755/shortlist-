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

describe("audit logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "ADMIN" }, allowed: true });
  });

  it("returns filtered organization audit logs", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: "log-1", action: "APPLICATION_STAGE_CHANGED" }]);
    mockedGetPrisma.mockReturnValue({ auditLog: { findMany } } as never);
    const response = await GET(new Request("http://localhost/api/organizations/o-1/audit-logs?action=APPLICATION_STAGE_CHANGED&entityType=Application"), { params: Promise.resolve({ organizationId: "o-1" }) });
    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "o-1", action: "APPLICATION_STAGE_CHANGED", entityType: "Application" } }));
  });

  it("requires audit permission", async () => {
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "INTERVIEWER" }, allowed: false });
    mockedGetPrisma.mockReturnValue({} as never);
    const response = await GET(new Request("http://localhost/api/organizations/o-1/audit-logs"), { params: Promise.resolve({ organizationId: "o-1" }) });
    expect(response.status).toBe(403);
  });
});
