import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";
import { POST } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/organizations/access", () => ({ canAccessOrganization: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));
const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedCanAccess = vi.mocked(canAccessOrganization);
const mockedGetPrisma = vi.mocked(getPrisma);

describe("coding assessment questions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
  });

  it("adds questions only to draft assessments", async () => {
    const create = vi.fn().mockResolvedValue({ id: "q-1", position: 1 });
    mockedGetPrisma.mockReturnValue({ codingAssessment: { findFirst: vi.fn().mockResolvedValue({ id: "a-1", status: "DRAFT" }) }, codingQuestion: { findFirst: vi.fn().mockResolvedValue(null), create } } as never);
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ prompt: "Write a function" }) }), { params: Promise.resolve({ organizationId: "o-1", applicationId: "app-1", assessmentId: "a-1" }) });
    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ assessmentId: "a-1", position: 1 }) }));
  });
});
