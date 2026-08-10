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
const start = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const end = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

describe("application interviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
  });

  it("lists only interviews for the scoped application", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: "i-1" }]);
    mockedGetPrisma.mockReturnValue({ application: { findFirst: vi.fn().mockResolvedValue({ id: "a-1" }) }, interview: { findMany } } as never);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve(params) });

    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "o-1", applicationId: "a-1" } }));
  });

  it("requires an authorized organization member as interviewer", async () => {
    const create = vi.fn();
    mockedGetPrisma.mockReturnValue({
      application: { findFirst: vi.fn().mockResolvedValue({ id: "a-1" }) },
      membership: { findUnique: vi.fn().mockResolvedValue(null) },
      interview: { create },
    } as never);

    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ interviewerId: "u-2", scheduledStart: start, scheduledEnd: end, meetingUrl: "https://meet.example/interview" }) }), { params: Promise.resolve(params) });

    expect(response.status).toBe(422);
    expect(create).not.toHaveBeenCalled();
  });
});
