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
const params = { organizationId: "o-1", applicationId: "a-1", interviewId: "i-1" };
const validBody = { criteria: [{ name: "Communication", rating: 4 }], overallRating: 4, strengths: "Clear", concerns: "None" };

describe("interview scorecard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurrentUser.mockResolvedValue({ id: "u-2", email: "interviewer@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "INTERVIEWER" }, allowed: true });
  });

  it("allows the assigned interviewer to submit one scorecard", async () => {
    const create = vi.fn().mockResolvedValue({ id: "s-1", overallRating: 4 });
    mockedGetPrisma.mockReturnValue({
      interview: { findFirst: vi.fn().mockResolvedValue({ id: "i-1", interviewerId: "u-2", status: "COMPLETED" }) },
      interviewScorecard: { create },
    } as never);

    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify(validBody) }), { params: Promise.resolve(params) });

    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ interviewId: "i-1", submittedById: "u-2", overallRating: 4 }) }));
  });

  it("prevents an interviewer from scoring another interviewer’s interview", async () => {
    mockedGetPrisma.mockReturnValue({ interview: { findFirst: vi.fn().mockResolvedValue({ id: "i-1", interviewerId: "u-other", status: "COMPLETED" }) }, interviewScorecard: { create: vi.fn() } } as never);

    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify(validBody) }), { params: Promise.resolve(params) });

    expect(response.status).toBe(403);
  });

  it("returns a stored scorecard through the scoped interview", async () => {
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "HIRING_MANAGER" }, allowed: true });
    const findFirst = vi.fn().mockResolvedValue({ id: "i-1", interviewerId: "u-2", status: "COMPLETED" });
    mockedGetPrisma.mockReturnValue({ interview: { findFirst }, interviewScorecard: { findUnique: vi.fn().mockResolvedValue({ id: "s-1", overallRating: 4 }) } } as never);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve(params) });

    expect(response.status).toBe(200);
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "i-1", organizationId: "o-1", applicationId: "a-1" } }));
  });
});
