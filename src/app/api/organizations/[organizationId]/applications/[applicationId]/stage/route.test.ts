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

describe("PATCH application stage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records a valid stage transition", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
    const transaction = {
      application: { update: vi.fn().mockResolvedValue({ id: "a-1", currentStage: "SCREENING", updatedAt: new Date() }) },
      applicationStageHistory: { create: vi.fn().mockResolvedValue({}) },
    };
    mockedGetPrisma.mockReturnValue({
      application: { findFirst: vi.fn().mockResolvedValue({ id: "a-1", currentStage: "APPLIED" }) },
      $transaction: vi.fn(async (callback) => callback(transaction)),
    } as never);

    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ stage: "SCREENING" }) }), { params: Promise.resolve({ organizationId: "o-1", applicationId: "a-1" }) });

    expect(response.status).toBe(200);
    expect(transaction.applicationStageHistory.create).toHaveBeenCalledWith({
      data: { applicationId: "a-1", changedById: "u-1", fromStage: "APPLIED", toStage: "SCREENING" },
    });
  });

  it("rejects invalid stage jumps", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
    mockedGetPrisma.mockReturnValue({ application: { findFirst: vi.fn().mockResolvedValue({ id: "a-1", currentStage: "APPLIED" }) } } as never);

    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ stage: "HIRED" }) }), { params: Promise.resolve({ organizationId: "o-1", applicationId: "a-1" }) });

    expect(response.status).toBe(409);
  });
});
