import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { parseResumeText } from "@/features/resumes/parser";
import { readResume } from "@/features/resumes/storage";
import { getPrisma } from "@/lib/db";
import { POST } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/organizations/access", () => ({ canAccessOrganization: vi.fn() }));
vi.mock("@/features/resumes/parser", () => ({ parseResumeText: vi.fn() }));
vi.mock("@/features/resumes/storage", () => ({ readResume: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedCanAccess = vi.mocked(canAccessOrganization);
const mockedParseResumeText = vi.mocked(parseResumeText);
const mockedReadResume = vi.mocked(readResume);
const mockedGetPrisma = vi.mocked(getPrisma);

const params = { organizationId: "o-1", candidateId: "c-1", resumeId: "r-1" };

describe("resume parsing", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires authentication", async () => {
    mockedGetCurrentUser.mockResolvedValue(null);

    const response = await POST(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve(params) });

    expect(response.status).toBe(401);
  });

  it("does not parse a resume from another candidate or organization", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
    mockedGetPrisma.mockReturnValue({ resume: { findFirst: vi.fn().mockResolvedValue(null) } } as never);

    const response = await POST(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve(params) });

    expect(response.status).toBe(404);
    expect(mockedReadResume).not.toHaveBeenCalled();
  });

  it("parses and persists the resume text", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "u-1", email: "r@example.com" });
    mockedCanAccess.mockResolvedValue({ membership: { id: "m-1", role: "RECRUITER" }, allowed: true });
    const update = vi.fn().mockResolvedValue({ id: "r-1", parsedText: "Ada Lovelace", parsedAt: new Date("2026-08-10") });
    mockedGetPrisma.mockReturnValue({
      resume: {
        findFirst: vi.fn().mockResolvedValue({ id: "r-1", storageKey: "safe.pdf", mimeType: "application/pdf" }),
        update,
      },
    } as never);
    mockedReadResume.mockResolvedValue(Buffer.from("pdf"));
    mockedParseResumeText.mockResolvedValue("Ada Lovelace");

    const response = await POST(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve(params) });

    expect(response.status).toBe(200);
    expect(mockedParseResumeText).toHaveBeenCalledWith("application/pdf", Buffer.from("pdf"));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "r-1" }, data: { parsedText: "Ada Lovelace", parsedAt: expect.any(Date) } }));
  });
});
