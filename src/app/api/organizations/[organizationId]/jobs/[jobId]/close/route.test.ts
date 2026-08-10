import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { getJobInOrganization } from "@/features/jobs/access";
import { getPrisma } from "@/lib/db";
import { POST } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/organizations/access", () => ({ canAccessOrganization: vi.fn() }));
vi.mock("@/features/jobs/access", () => ({ getJobInOrganization: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedCanAccess = vi.mocked(canAccessOrganization);
const mockedGetJob = vi.mocked(getJobInOrganization);
const mockedGetPrisma = vi.mocked(getPrisma);

describe("POST /close", () => {
  beforeEach(() => vi.clearAllMocks());

  it("closes a published job", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "a@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "ADMIN" }, allowed: true });
    mockedGetJob.mockResolvedValue({ id: "j-1", organizationId: "o-1", title: "Engineer", description: "Build", status: "PUBLISHED" });
    mockedGetPrisma.mockReturnValue({ job: { update: vi.fn().mockResolvedValue({ id: "j-1", status: "CLOSED" }) } } as never);

    const response = await POST(new Request("http://localhost"), { params: Promise.resolve({ organizationId: "o-1", jobId: "j-1" }) });
    expect(response.status).toBe(200);
  });

  it("rejects closing a draft", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "a@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "ADMIN" }, allowed: true });
    mockedGetJob.mockResolvedValue({ id: "j-1", organizationId: "o-1", title: "Engineer", description: "Build", status: "DRAFT" });

    const response = await POST(new Request("http://localhost"), { params: Promise.resolve({ organizationId: "o-1", jobId: "j-1" }) });
    expect(response.status).toBe(409);
  });
});
