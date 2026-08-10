import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";
import { GET, POST } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/organizations/access", () => ({ canAccessOrganization: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedCanAccessOrganization = vi.mocked(canAccessOrganization);
const mockedGetPrisma = vi.mocked(getPrisma);

function requestWithBody(body: unknown) {
  return new Request("http://localhost", { method: "POST", body: JSON.stringify(body) });
}

describe("/api/organizations/:organizationId/jobs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a draft job for a manager", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "user-1", email: "a@example.com" });
    mockedCanAccessOrganization.mockResolvedValue({
      membership: { id: "membership-1", role: "RECRUITER" },
      allowed: true,
    });
    const create = vi.fn().mockResolvedValue({
      id: "job-1",
      title: "Engineer",
      description: "Build systems",
      status: "DRAFT",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockedGetPrisma.mockReturnValue({ job: { create } } as never);

    const response = await POST(
      requestWithBody({ title: " Engineer ", description: " Build systems " }),
      { params: Promise.resolve({ organizationId: "org-1" }) },
    );

    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          organizationId: "org-1",
          createdById: "user-1",
          title: "Engineer",
          description: "Build systems",
        },
      }),
    );
  });

  it("rejects job creation without job-management permission", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "user-1", email: "i@example.com" });
    mockedCanAccessOrganization.mockResolvedValue({
      membership: { id: "membership-1", role: "INTERVIEWER" },
      allowed: false,
    });

    const response = await POST(
      requestWithBody({ title: "Engineer", description: "Build systems" }),
      { params: Promise.resolve({ organizationId: "org-1" }) },
    );

    expect(response.status).toBe(403);
    expect(mockedGetPrisma).not.toHaveBeenCalled();
  });

  it("lists jobs only with job-read permission", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "user-1", email: "a@example.com" });
    mockedCanAccessOrganization.mockResolvedValue({
      membership: { id: "membership-1", role: "INTERVIEWER" },
      allowed: true,
    });
    const findMany = vi.fn().mockResolvedValue([]);
    mockedGetPrisma.mockReturnValue({ job: { findMany } } as never);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ organizationId: "org-1" }),
    });

    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1" } }));
  });

  it("validates job input", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "user-1", email: "a@example.com" });
    mockedCanAccessOrganization.mockResolvedValue({
      membership: { id: "membership-1", role: "ADMIN" },
      allowed: true,
    });

    const response = await POST(
      requestWithBody({ title: "A", description: "" }),
      { params: Promise.resolve({ organizationId: "org-1" }) },
    );

    expect(response.status).toBe(400);
  });
});
