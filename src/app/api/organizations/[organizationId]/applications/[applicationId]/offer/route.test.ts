import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";
import { POST, PATCH } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/organizations/access", () => ({ canAccessOrganization: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));
const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedCanAccess = vi.mocked(canAccessOrganization);
const mockedGetPrisma = vi.mocked(getPrisma);
const params = { organizationId: "o-1", applicationId: "a-1" };

describe("organization offer workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
  });

  it("creates a draft offer for an application", async () => {
    const create = vi.fn().mockResolvedValue({ id: "offer-1", status: "DRAFT" });
    mockedGetPrisma.mockReturnValue({ application: { findFirst: vi.fn().mockResolvedValue({ id: "a-1" }) }, offer: { create } } as never);
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ title: "Offer", details: "Details" }) }), { params: Promise.resolve(params) });
    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId: "o-1", applicationId: "a-1", createdById: "u-1" }) }));
  });

  it("sends only a draft offer", async () => {
    const update = vi.fn().mockResolvedValue({ id: "offer-1", status: "SENT" });
    mockedGetPrisma.mockReturnValue({ offer: { findFirst: vi.fn().mockResolvedValue({ id: "offer-1", status: "DRAFT", expiresAt: null }), update } } as never);
    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ status: "SENT" }) }), { params: Promise.resolve(params) });
    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "SENT", sentAt: expect.any(Date) }) }));
  });
});
