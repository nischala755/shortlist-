import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import { summarizeFeedbackWithMistral } from "@/features/hiring-assistance/provider";
import { canAccessOrganization } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";
import { POST } from "./route";

vi.mock("@/features/audit/audit", () => ({ recordAuditLogSafely: vi.fn() }));
vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/hiring-assistance/provider", () => ({
  summarizeFeedbackWithMistral: vi.fn(),
  HiringAssistanceProviderError: class HiringAssistanceProviderError extends Error {},
}));
vi.mock("@/features/organizations/access", () => ({ canAccessOrganization: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));

const params = { organizationId: "org-1", applicationId: "app-1", interviewId: "int-1" };

describe("AI interview feedback summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1", email: "manager@example.com" });
    vi.mocked(canAccessOrganization).mockResolvedValue({
      membership: { id: "membership-1", role: "HIRING_MANAGER" },
      allowed: true,
    });
    vi.mocked(summarizeFeedbackWithMistral).mockResolvedValue({
      provider: "mistral",
      model: "mistral-small-latest",
      summary: { summary: "Observed examples", strengths: [], concerns: [], followUpQuestions: [] },
    });
  });

  it("summarizes a scorecard in the exact application scope", async () => {
    const scorecard = { criteriaJson: [], overallRating: 4, strengths: "Examples", concerns: null, notes: null };
    const findFirst = vi.fn().mockResolvedValue(scorecard);
    vi.mocked(getPrisma).mockReturnValue({ interviewScorecard: { findFirst } } as never);

    const response = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve(params),
    });

    expect(response.status).toBe(200);
    expect(summarizeFeedbackWithMistral).toHaveBeenCalledWith(scorecard);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          interview: expect.objectContaining({ organizationId: "org-1", applicationId: "app-1" }),
        }),
      }),
    );
  });

  it("limits interviewers to their assigned interview", async () => {
    vi.mocked(canAccessOrganization).mockResolvedValue({
      membership: { id: "membership-1", role: "INTERVIEWER" },
      allowed: true,
    });
    const findFirst = vi.fn().mockResolvedValue(null);
    vi.mocked(getPrisma).mockReturnValue({ interviewScorecard: { findFirst } } as never);

    const response = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve(params),
    });

    expect(response.status).toBe(404);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          interview: expect.objectContaining({ interviewerId: "user-1" }),
        }),
      }),
    );
    expect(summarizeFeedbackWithMistral).not.toHaveBeenCalled();
  });
});
