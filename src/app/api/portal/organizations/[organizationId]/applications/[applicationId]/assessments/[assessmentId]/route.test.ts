import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCandidatePortalContext } from "@/features/candidate-portal/access";
import { getPrisma } from "@/lib/db";
import { GET, POST } from "./route";

vi.mock("@/features/candidate-portal/access", () => ({ getCandidatePortalContext: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));
const mockedPortalContext = vi.mocked(getCandidatePortalContext);
const mockedGetPrisma = vi.mocked(getPrisma);
const params = { organizationId: "o-1", applicationId: "app-1", assessmentId: "assess-1" };

describe("candidate portal assessment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPortalContext.mockResolvedValue({ user: { id: "u-1", email: "ada@example.com" }, candidate: { id: "c-1", name: "Ada", email: "ada@example.com" } });
  });

  it("only returns an assigned assessment for the candidate application", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "assess-1", title: "Task", durationMinutes: 60, status: "ASSIGNED", questions: [{ id: "q-1" }] });
    mockedGetPrisma.mockReturnValue({ codingAssessment: { findFirst }, codingSubmission: { findUnique: vi.fn().mockResolvedValue(null) } } as never);
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve(params) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ assessment: { questions: [] }, submission: null, requiresStart: true });
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "assess-1", organizationId: "o-1", applicationId: "app-1", status: "ASSIGNED", application: { candidateId: "c-1" } } }));
  });

  it("reveals questions after the candidate starts a submission", async () => {
    mockedGetPrisma.mockReturnValue({
      codingAssessment: { findFirst: vi.fn().mockResolvedValue({ id: "assess-1", title: "Task", durationMinutes: 60, status: "ASSIGNED", questions: [{ id: "q-1", prompt: "Solve" }] }) },
      codingSubmission: { findUnique: vi.fn().mockResolvedValue({ id: "sub-1", status: "DRAFT", answersJson: {}, startedAt: new Date() }) },
    } as never);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve(params) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ assessment: { questions: [{ id: "q-1" }] }, requiresStart: false });
  });

  it("creates a draft submission without executing candidate code", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "sub-1", status: "DRAFT" });
    mockedGetPrisma.mockReturnValue({
      codingAssessment: { findFirst: vi.fn().mockResolvedValue({ id: "assess-1", durationMinutes: 60, status: "ASSIGNED", questions: [{ id: "q-1" }] }) },
      codingSubmission: { findUnique: vi.fn().mockResolvedValue(null), upsert },
    } as never);
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ status: "DRAFT", answers: { "q-1": "console.log(1)" } }) }), { params: Promise.resolve(params) });
    expect(response.status).toBe(201);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ assessmentId: "assess-1", submittedById: "u-1", status: "DRAFT" }) }));
  });
});
