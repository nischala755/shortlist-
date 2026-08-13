import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordAuditLogSafely } from "@/features/audit/audit";
import { getCurrentUser } from "@/features/auth/session";
import { assistApplicationWithMistral } from "@/features/hiring-assistance/provider";
import { canAccessOrganization } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";
import { POST } from "./route";

vi.mock("@/features/audit/audit", () => ({ recordAuditLogSafely: vi.fn() }));
vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/hiring-assistance/provider", () => ({
  assistApplicationWithMistral: vi.fn(),
  HiringAssistanceProviderError: class HiringAssistanceProviderError extends Error {},
}));
vi.mock("@/features/organizations/access", () => ({ canAccessOrganization: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));

const params = { organizationId: "org-1", applicationId: "app-1" };
const application = {
  id: "app-1",
  job: { requirements: [{ id: "req-1", title: "TypeScript", description: "Production TypeScript" }] },
  candidate: { resumes: [{ parsedText: "Built TypeScript services" }] },
};

describe("application AI assistance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1", email: "reviewer@example.com" });
    vi.mocked(canAccessOrganization).mockResolvedValue({
      membership: { id: "membership-1", role: "RECRUITER" },
      allowed: true,
    });
    vi.mocked(getPrisma).mockReturnValue({
      application: { findFirst: vi.fn().mockResolvedValue(application) },
    } as never);
    vi.mocked(assistApplicationWithMistral).mockResolvedValue({
      provider: "mistral",
      model: "mistral-small-latest",
      assistance: { mappings: [], interviewQuestions: [] },
    });
  });

  it("returns transient grounded assistance for a scoped application", async () => {
    const response = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve(params),
    });

    expect(response.status).toBe(200);
    expect(assistApplicationWithMistral).toHaveBeenCalledWith(
      application.job.requirements,
      "Built TypeScript services",
    );
    expect(recordAuditLogSafely).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: "app-1" }),
    );
  });

  it("does not call the provider without a parsed resume", async () => {
    vi.mocked(getPrisma).mockReturnValue({
      application: {
        findFirst: vi.fn().mockResolvedValue({
          ...application,
          candidate: { resumes: [] },
        }),
      },
    } as never);

    const response = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve(params),
    });

    expect(response.status).toBe(409);
    expect(assistApplicationWithMistral).not.toHaveBeenCalled();
  });

  it("rejects an authenticated user without candidate access", async () => {
    vi.mocked(canAccessOrganization).mockResolvedValue({
      membership: { id: "membership-1", role: "INTERVIEWER" },
      allowed: false,
    });

    const response = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve(params),
    });
    expect(response.status).toBe(403);
    expect(getPrisma).not.toHaveBeenCalled();
  });
});
