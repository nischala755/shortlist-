import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/session";
import { canAccessOrganization } from "@/features/organizations/access";
import { getPrisma } from "@/lib/db";
import { DELETE, PATCH } from "./route";

vi.mock("@/features/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/organizations/access", () => ({ canAccessOrganization: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));

const params = {
  organizationId: "org-1",
  applicationId: "app-1",
  assessmentId: "assessment-1",
  questionId: "question-1",
};

describe("draft assessment question management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1", email: "recruiter@example.com" });
    vi.mocked(canAccessOrganization).mockResolvedValue({
      membership: { id: "membership-1", role: "RECRUITER" },
      allowed: true,
    });
  });

  it("updates a question only through its draft application scope", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "question-1" });
    const update = vi.fn().mockResolvedValue({ id: "question-1", prompt: "Updated", points: 3 });
    vi.mocked(getPrisma).mockReturnValue({ codingQuestion: { findFirst, update } } as never);

    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ prompt: "Updated", points: 3 }),
      }),
      { params: Promise.resolve(params) },
    );

    expect(response.status).toBe(200);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assessment: { organizationId: "org-1", applicationId: "app-1", status: "DRAFT" },
        }),
      }),
    );
  });

  it("deletes only a question belonging to that draft assessment", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    vi.mocked(getPrisma).mockReturnValue({ codingQuestion: { deleteMany } } as never);

    const response = await DELETE(new Request("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve(params),
    });

    expect(response.status).toBe(204);
    expect(deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "question-1", assessmentId: "assessment-1" }),
      }),
    );
  });

  it("rejects question changes without assessment management permission", async () => {
    vi.mocked(canAccessOrganization).mockResolvedValue({
      membership: { id: "membership-1", role: "INTERVIEWER" },
      allowed: false,
    });

    const response = await DELETE(new Request("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve(params),
    });
    expect(response.status).toBe(403);
    expect(getPrisma).not.toHaveBeenCalled();
  });
});
