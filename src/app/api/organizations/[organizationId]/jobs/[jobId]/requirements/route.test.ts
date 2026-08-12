import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { getJobInOrganization } from "@/features/jobs/access";
import { getPrisma } from "@/lib/db";
import { GET, POST } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/organizations/access", () => ({ canAccessOrganization: vi.fn() }));
vi.mock("@/features/jobs/access", () => ({ getJobInOrganization: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedCanAccess = vi.mocked(canAccessOrganization);
const mockedGetJob = vi.mocked(getJobInOrganization);
const mockedGetPrisma = vi.mocked(getPrisma);

describe("job requirements", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a requirement on a draft job", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "a@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "ADMIN" }, allowed: true });
    mockedGetJob.mockResolvedValue({ id: "j-1", organizationId: "o-1", title: "Engineer", description: "Build", status: "DRAFT" });
    mockedGetPrisma.mockReturnValue({ jobRequirement: { create: vi.fn().mockResolvedValue({ id: "r-1" }) } } as never);

    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ title: "TypeScript", description: "Strong TypeScript skills" }) }), { params: Promise.resolve({ organizationId: "o-1", jobId: "j-1" }) });
    expect(response.status).toBe(201);
  });

  it("does not change requirements on a published job", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "a@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "ADMIN" }, allowed: true });
    mockedGetJob.mockResolvedValue({ id: "j-1", organizationId: "o-1", title: "Engineer", description: "Build", status: "PUBLISHED" });

    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ title: "TypeScript", description: "Strong TypeScript skills" }) }), { params: Promise.resolve({ organizationId: "o-1", jobId: "j-1" }) });
    expect(response.status).toBe(409);
  });

  it("lists requirements for a readable job", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "a@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "INTERVIEWER" }, allowed: true });
    mockedGetJob.mockResolvedValue({ id: "j-1", organizationId: "o-1", title: "Engineer", description: "Build", status: "PUBLISHED" });
    mockedGetPrisma.mockReturnValue({ jobRequirement: { findMany: vi.fn().mockResolvedValue([]) } } as never);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ organizationId: "o-1", jobId: "j-1" }) });
    expect(response.status).toBe(200);
  });

  it("reports a duplicate requirement title as a conflict", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "a@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "ADMIN" }, allowed: true });
    mockedGetJob.mockResolvedValue({ id: "j-1", organizationId: "o-1", title: "Engineer", description: "Build", status: "DRAFT" });
    mockedGetPrisma.mockReturnValue({ jobRequirement: { create: vi.fn().mockRejectedValue({ code: "P2002" }) } } as never);

    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ title: "TypeScript", description: "Strong TypeScript skills" }) }), { params: Promise.resolve({ organizationId: "o-1", jobId: "j-1" }) });

    expect(response.status).toBe(409);
  });
});
