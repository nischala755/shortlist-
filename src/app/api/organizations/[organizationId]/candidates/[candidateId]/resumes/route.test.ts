import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";
import { saveResume } from "@/features/resumes/storage";
import { GET, POST } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/organizations/access", () => ({ canAccessOrganization: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));
vi.mock("@/features/resumes/storage", () => ({
  saveResume: vi.fn(),
  removeResume: vi.fn(),
  ResumeValidationError: class ResumeValidationError extends Error {},
}));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedCanAccess = vi.mocked(canAccessOrganization);
const mockedGetPrisma = vi.mocked(getPrisma);
const mockedSaveResume = vi.mocked(saveResume);

describe("candidate resumes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists resume metadata without exposing storage keys", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
    mockedGetPrisma.mockReturnValue({
      candidate: { findFirst: vi.fn().mockResolvedValue({ id: "c-1" }) },
      resume: { findMany: vi.fn().mockResolvedValue([{ id: "r-1", originalName: "resume.pdf" }]) },
    } as never);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ organizationId: "o-1", candidateId: "c-1" }) });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.resumes[0]).not.toHaveProperty("storageKey");
  });

  it("uploads a validated resume for a candidate", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
    mockedGetPrisma.mockReturnValue({
      candidate: { findFirst: vi.fn().mockResolvedValue({ id: "c-1" }) },
      resume: { create: vi.fn().mockResolvedValue({ id: "r-1", originalName: "resume.pdf" }) },
    } as never);
    mockedSaveResume.mockResolvedValue({ storageKey: "safe.pdf", originalName: "resume.pdf", mimeType: "application/pdf", sizeBytes: 3, sha256: "hash" });

    const form = new FormData();
    form.set("resume", new File(["pdf"], "resume.pdf", { type: "application/pdf" }));
    const response = await POST(new Request("http://localhost", { method: "POST", body: form }), { params: Promise.resolve({ organizationId: "o-1", candidateId: "c-1" }) });

    expect(response.status).toBe(201);
    expect(mockedSaveResume).toHaveBeenCalled();
  });

  it("requires a resume file", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
    mockedGetPrisma.mockReturnValue({ candidate: { findFirst: vi.fn().mockResolvedValue({ id: "c-1" }) } } as never);

    const response = await POST(new Request("http://localhost", { method: "POST", body: new FormData() }), { params: Promise.resolve({ organizationId: "o-1", candidateId: "c-1" }) });

    expect(response.status).toBe(400);
    expect(mockedSaveResume).not.toHaveBeenCalled();
  });
});
