import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";
import { DELETE, GET } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/organizations/access", () => ({ canAccessOrganization: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedCanAccess = vi.mocked(canAccessOrganization);
const mockedGetPrisma = vi.mocked(getPrisma);
const params = { organizationId: "o-1", applicationId: "a-1", interviewId: "i-1" };

describe("application interview item", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
  });

  it("returns a scoped interview", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "i-1", status: "SCHEDULED" });
    mockedGetPrisma.mockReturnValue({ interview: { findFirst } } as never);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve(params) });

    expect(response.status).toBe(200);
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "i-1", organizationId: "o-1", applicationId: "a-1" } }));
  });

  it("cancels instead of deleting the interview record", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    mockedGetPrisma.mockReturnValue({ interview: { updateMany } } as never);

    const response = await DELETE(new Request("http://localhost", { method: "DELETE" }), { params: Promise.resolve(params) });

    expect(response.status).toBe(204);
    expect(updateMany).toHaveBeenCalledWith({ where: { id: "i-1", organizationId: "o-1", applicationId: "a-1" }, data: { status: "CANCELLED" } });
  });
});
