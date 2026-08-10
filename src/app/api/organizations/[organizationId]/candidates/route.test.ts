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

describe("/api/organizations/:organizationId/candidates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a candidate for a recruiter", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
    const create = vi.fn().mockResolvedValue({ id: "c-1" });
    mockedGetPrisma.mockReturnValue({ candidate: { create } } as never);

    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ name: "Ada Lovelace", email: "ADA@example.com" }) }), { params: Promise.resolve({ organizationId: "o-1" }) });

    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: { organizationId: "o-1", createdById: "u-1", name: "Ada Lovelace", email: "ada@example.com" } }));
  });

  it("rejects candidate creation for an interviewer", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "i@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "INTERVIEWER" }, allowed: false });

    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ name: "Ada Lovelace", email: "ada@example.com" }) }), { params: Promise.resolve({ organizationId: "o-1" }) });

    expect(response.status).toBe(403);
    expect(mockedGetPrisma).not.toHaveBeenCalled();
  });

  it("allows interviewer candidate reads", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "i@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "INTERVIEWER" }, allowed: true });
    const findMany = vi.fn().mockResolvedValue([]);
    mockedGetPrisma.mockReturnValue({ candidate: { findMany } } as never);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ organizationId: "o-1" }) });

    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "o-1" } }));
  });

  it("passes search terms to the organization-scoped query", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "i@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "INTERVIEWER" }, allowed: true });
    const findMany = vi.fn().mockResolvedValue([]);
    mockedGetPrisma.mockReturnValue({ candidate: { findMany } } as never);

    const response = await GET(new Request("http://localhost/api/organizations/o-1/candidates?q=ada"), { params: Promise.resolve({ organizationId: "o-1" }) });

    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        organizationId: "o-1",
        OR: [
          { name: { contains: "ada", mode: "insensitive" } },
          { email: { contains: "ada", mode: "insensitive" } },
        ],
      }),
    }));
  });

  it("rejects duplicate candidate email", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
    mockedGetPrisma.mockReturnValue({ candidate: { create: vi.fn().mockRejectedValue({ code: "P2002" }) } } as never);

    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ name: "Ada Lovelace", email: "ada@example.com" }) }), { params: Promise.resolve({ organizationId: "o-1" }) });

    expect(response.status).toBe(409);
  });
});
