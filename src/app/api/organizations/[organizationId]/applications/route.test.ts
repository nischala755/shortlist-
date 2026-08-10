import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";
import { Role } from "@/generated/prisma/client";
import { GET, POST } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/organizations/access", () => ({ canAccessOrganization: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));

const user = { id: "u-1", email: "r@example.com" };
const access = { membership: { id: "m-1", role: Role.RECRUITER }, allowed: true };
const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedCanAccess = vi.mocked(canAccessOrganization);
const mockedGetPrisma = vi.mocked(getPrisma);

describe("/api/organizations/:organizationId/applications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an application only from records in the same organization", async () => {
    mockedGetCurrentUser.mockResolvedValue(user);
    mockedCanAccess.mockResolvedValue(access);
    const transaction = {
      job: { findFirst: vi.fn().mockResolvedValue({ id: "job-1" }) },
      candidate: { findFirst: vi.fn().mockResolvedValue({ id: "candidate-1" }) },
      application: { create: vi.fn().mockResolvedValue({ id: "application-1", currentStage: "APPLIED" }) },
    };
    mockedGetPrisma.mockReturnValue({ $transaction: vi.fn(async (callback) => callback(transaction)) } as never);

    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ jobId: "job-1", candidateId: "candidate-1" }) }), { params: Promise.resolve({ organizationId: "org-1" }) });

    expect(response.status).toBe(201);
    expect(transaction.application.create).toHaveBeenCalled();
  });

  it("rejects an application when either record is outside the organization", async () => {
    mockedGetCurrentUser.mockResolvedValue(user);
    mockedCanAccess.mockResolvedValue(access);
    const transaction = {
      job: { findFirst: vi.fn().mockResolvedValue(null) },
      candidate: { findFirst: vi.fn() },
      application: { create: vi.fn() },
    };
    mockedGetPrisma.mockReturnValue({ $transaction: vi.fn(async (callback) => callback(transaction)) } as never);

    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ jobId: "other-job", candidateId: "candidate-1" }) }), { params: Promise.resolve({ organizationId: "org-1" }) });

    expect(response.status).toBe(404);
    expect(transaction.application.create).not.toHaveBeenCalled();
  });

  it("lists applications by organization and optional stage", async () => {
    mockedGetCurrentUser.mockResolvedValue(user);
    mockedCanAccess.mockResolvedValue(access);
    const findMany = vi.fn().mockResolvedValue([]);
    mockedGetPrisma.mockReturnValue({ application: { findMany } } as never);

    const response = await GET(new Request("http://localhost/api/organizations/org-1/applications?stage=SCREENING"), { params: Promise.resolve({ organizationId: "org-1" }) });

    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1", currentStage: "SCREENING" } }));
  });
});
