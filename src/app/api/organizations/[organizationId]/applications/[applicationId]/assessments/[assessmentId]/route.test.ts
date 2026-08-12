import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";
import { PATCH } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/organizations/access", () => ({ canAccessOrganization: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedCanAccess = vi.mocked(canAccessOrganization);
const mockedGetPrisma = vi.mocked(getPrisma);
const params = { organizationId: "o-1", applicationId: "a-1", assessmentId: "assessment-1" };

describe("coding assessment item", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
  });

  it("updates one draft field without requiring the full assessment", async () => {
    const update = vi.fn().mockResolvedValue({ id: "assessment-1", status: "DRAFT", title: "Updated task" });
    mockedGetPrisma.mockReturnValue({
      codingAssessment: {
        findFirst: vi.fn().mockResolvedValue({ id: "assessment-1", status: "DRAFT" }),
        update,
      },
    } as never);

    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ title: "Updated task" }) }), { params: Promise.resolve(params) });

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { title: "Updated task" } }));
  });

  it("rejects closing before a final submission", async () => {
    const update = vi.fn();
    mockedGetPrisma.mockReturnValue({ codingAssessment: { findFirst: vi.fn().mockResolvedValue({ id: "assessment-1", status: "ASSIGNED" }), update }, codingSubmission: { findUnique: vi.fn().mockResolvedValue({ status: "DRAFT" }) } } as never);

    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ status: "CLOSED" }) }), { params: Promise.resolve(params) });

    expect(response.status).toBe(409);
    expect(update).not.toHaveBeenCalled();
  });
});
