import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { getJobInOrganization } from "@/features/jobs/access";
import { getPrisma } from "@/lib/db";
import { Role } from "@/generated/prisma/client";
import { GET, PATCH } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/organizations/access", () => ({ canAccessOrganization: vi.fn() }));
vi.mock("@/features/jobs/access", () => ({ getJobInOrganization: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));

const user = { id: "user-1", email: "a@example.com" };
const adminAccess = { membership: { id: "m-1", role: Role.ADMIN }, allowed: true };
const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedCanAccessOrganization = vi.mocked(canAccessOrganization);
const mockedGetJob = vi.mocked(getJobInOrganization);
const mockedGetPrisma = vi.mocked(getPrisma);

describe("/api/organizations/:organizationId/jobs/:jobId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a scoped job", async () => {
    mockedGetCurrentUser.mockResolvedValue(user);
    mockedCanAccessOrganization.mockResolvedValue(adminAccess);
    mockedGetJob.mockResolvedValue({ id: "job-1", organizationId: "org-1", title: "Engineer", description: "Build", status: "DRAFT" });

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ organizationId: "org-1", jobId: "job-1" }) });

    expect(response.status).toBe(200);
  });

  it("returns not found for a job outside the organization", async () => {
    mockedGetCurrentUser.mockResolvedValue(user);
    mockedCanAccessOrganization.mockResolvedValue(adminAccess);
    mockedGetJob.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ organizationId: "org-1", jobId: "other-job" }) });

    expect(response.status).toBe(404);
  });

  it("edits draft jobs", async () => {
    mockedGetCurrentUser.mockResolvedValue(user);
    mockedCanAccessOrganization.mockResolvedValue(adminAccess);
    mockedGetJob.mockResolvedValue({ id: "job-1", organizationId: "org-1", title: "Old", description: "Build", status: "DRAFT" });
    const update = vi.fn().mockResolvedValue({ id: "job-1", title: "New", description: "Build more", status: "DRAFT", createdAt: new Date(), updatedAt: new Date() });
    mockedGetPrisma.mockReturnValue({ job: { update } } as never);

    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ title: "New", description: "Build more" }) }), { params: Promise.resolve({ organizationId: "org-1", jobId: "job-1" }) });

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalled();
  });

  it("does not edit published jobs", async () => {
    mockedGetCurrentUser.mockResolvedValue(user);
    mockedCanAccessOrganization.mockResolvedValue(adminAccess);
    mockedGetJob.mockResolvedValue({ id: "job-1", organizationId: "org-1", title: "Published", description: "Build", status: "PUBLISHED" });

    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ title: "New", description: "Build more" }) }), { params: Promise.resolve({ organizationId: "org-1", jobId: "job-1" }) });

    expect(response.status).toBe(409);
  });
});
