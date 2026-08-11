import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCandidatePortalContext } from "@/features/candidate-portal/access";
import { getPrisma } from "@/lib/db";
import { GET, POST } from "./route";

vi.mock("@/features/candidate-portal/access", () => ({ getCandidatePortalContext: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));
const mockedPortalContext = vi.mocked(getCandidatePortalContext);
const mockedGetPrisma = vi.mocked(getPrisma);
const params = { organizationId: "o-1", applicationId: "a-1" };

describe("candidate offer portal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPortalContext.mockResolvedValue({ user: { id: "u-2", email: "ada@example.com" }, candidate: { id: "c-1", name: "Ada", email: "ada@example.com" } });
  });

  it("does not expose draft offers to candidates", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    mockedGetPrisma.mockReturnValue({ offer: { findFirst } } as never);
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve(params) });
    expect(response.status).toBe(404);
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: { not: "DRAFT" }, application: { candidateId: "c-1" } }) }));
  });

  it("lets the candidate accept a sent offer", async () => {
    const update = vi.fn().mockResolvedValue({ id: "offer-1", status: "ACCEPTED" });
    mockedGetPrisma.mockReturnValue({ offer: { findFirst: vi.fn().mockResolvedValue({ id: "offer-1", status: "SENT", expiresAt: null }), update } } as never);
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ status: "ACCEPTED" }) }), { params: Promise.resolve(params) });
    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "ACCEPTED", respondedAt: expect.any(Date) }) }));
  });
});
