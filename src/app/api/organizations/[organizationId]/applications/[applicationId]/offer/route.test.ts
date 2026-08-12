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
    mockedGetPrisma.mockReturnValue({ application: { findFirst: vi.fn().mockResolvedValue({ id: "a-1", currentStage: "OFFER" }) }, offer: { create } } as never);
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ title: "Offer", details: "Details" }) }), { params: Promise.resolve(params) });
    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId: "o-1", applicationId: "a-1", createdById: "u-1" }) }));
  });

  it("sends only a draft offer", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    mockedGetPrisma.mockReturnValue({ offer: { findFirst: vi.fn().mockResolvedValue({ id: "offer-1", status: "DRAFT", expiresAt: null }), updateMany, findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "offer-1", title: "Offer", status: "SENT" }) } } as never);
    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ status: "SENT" }) }), { params: Promise.resolve(params) });
    expect(response.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "offer-1", status: "DRAFT" }, data: expect.objectContaining({ status: "SENT", sentAt: expect.any(Date) }) }));
  });

  it("updates one draft offer field without requiring the full offer", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    mockedGetPrisma.mockReturnValue({ offer: { findFirst: vi.fn().mockResolvedValue({ id: "offer-1", status: "DRAFT", expiresAt: null }), updateMany, findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "offer-1", status: "DRAFT", title: "Updated offer" }) } } as never);

    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ title: "Updated offer" }) }), { params: Promise.resolve(params) });

    expect(response.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { title: "Updated offer" } }));
  });

  it("rejects an offer draft before the application reaches offer review", async () => {
    mockedGetPrisma.mockReturnValue({ application: { findFirst: vi.fn().mockResolvedValue({ id: "a-1", currentStage: "INTERVIEW" }) } } as never);
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ title: "Offer", details: "Details" }) }), { params: Promise.resolve(params) });
    expect(response.status).toBe(409);
  });

  it("rejects a stale lifecycle update", async () => {
    mockedGetPrisma.mockReturnValue({ offer: { findFirst: vi.fn().mockResolvedValue({ id: "offer-1", status: "SENT", expiresAt: null }), updateMany: vi.fn().mockResolvedValue({ count: 0 }) } } as never);
    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ status: "WITHDRAWN" }) }), { params: Promise.resolve(params) });
    expect(response.status).toBe(409);
  });
});
