import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCandidatePortalContext } from "@/features/candidate-portal/access";
import { getPrisma } from "@/lib/db";
import { GET } from "./route";

vi.mock("@/features/candidate-portal/access", () => ({ getCandidatePortalContext: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));
const mockedPortalContext = vi.mocked(getCandidatePortalContext);
const mockedGetPrisma = vi.mocked(getPrisma);

describe("candidate portal applications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists applications for the authenticated candidate only", async () => {
    mockedPortalContext.mockResolvedValue({ user: { id: "u-1", email: "ada@example.com" }, candidate: { id: "c-1", name: "Ada", email: "ada@example.com" } });
    const findMany = vi.fn().mockResolvedValue([{ id: "app-1" }]);
    mockedGetPrisma.mockReturnValue({ application: { findMany } } as never);
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ organizationId: "o-1" }) });
    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "o-1", candidateId: "c-1" } }));
  });
});
