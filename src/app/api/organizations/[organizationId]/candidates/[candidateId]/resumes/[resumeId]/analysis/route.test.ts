import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { analyzeResumeWithMistral } from "@/features/resume-analysis/provider";
import { getPrisma } from "@/lib/db";
import { POST } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/organizations/access", () => ({ canAccessOrganization: vi.fn() }));
vi.mock("@/features/resume-analysis/provider", () => ({ analyzeResumeWithMistral: vi.fn(), ResumeAnalysisProviderError: class ResumeAnalysisProviderError extends Error {} }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedCanAccess = vi.mocked(canAccessOrganization);
const mockedAnalyze = vi.mocked(analyzeResumeWithMistral);
const mockedGetPrisma = vi.mocked(getPrisma);
const params = { organizationId: "o-1", candidateId: "c-1", resumeId: "r-1" };

describe("resume analysis", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires parsed resume text", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
    mockedGetPrisma.mockReturnValue({ resume: { findFirst: vi.fn().mockResolvedValue({ id: "r-1", parsedText: null }) } } as never);

    const response = await POST(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve(params) });

    expect(response.status).toBe(409);
    expect(mockedAnalyze).not.toHaveBeenCalled();
  });

  it("stores a validated provider result", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
    const upsert = vi.fn().mockResolvedValue({ id: "a-1", provider: "mistral", model: "mistral-small-latest", analysisJson: {}, createdAt: new Date() });
    mockedGetPrisma.mockReturnValue({ resume: { findFirst: vi.fn().mockResolvedValue({ id: "r-1", parsedText: "resume text" }) }, resumeAnalysis: { upsert } } as never);
    mockedAnalyze.mockResolvedValue({ provider: "mistral", model: "mistral-small-latest", analysis: { summary: "Engineer", skills: [], experienceHighlights: [], education: [], missingInformation: [], evidenceQuotes: [] } });

    const response = await POST(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve(params) });

    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { resumeId: "r-1" }, create: expect.objectContaining({ requestedById: "u-1" }) }));
  });
});
