import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPrisma } from "@/lib/db";
import { Role } from "@/generated/prisma/client";
import { getOrganizationForUser, hasPermission, listOrganizationMembers } from "./access";

vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));

const mockedGetPrisma = vi.mocked(getPrisma);

describe("organization access", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reserves member management for administrators", () => {
    expect(hasPermission(Role.ADMIN, "member:manage")).toBe(true);
    expect(hasPermission(Role.RECRUITER, "member:manage")).toBe(false);
    expect(hasPermission(Role.HIRING_MANAGER, "member:manage")).toBe(false);
  });

  it("limits interviewers to interview and scorecard permissions", () => {
    expect(hasPermission(Role.INTERVIEWER, "interview:read")).toBe(true);
    expect(hasPermission(Role.INTERVIEWER, "scorecard:manage")).toBe(true);
    expect(hasPermission(Role.INTERVIEWER, "candidate:read")).toBe(false);
    expect(hasPermission(Role.INTERVIEWER, "application:read")).toBe(false);
    expect(hasPermission(Role.INTERVIEWER, "offer:read")).toBe(false);
  });

  it("scopes organization lookup by membership", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    mockedGetPrisma.mockReturnValue({ organization: { findFirst } } as never);

    await getOrganizationForUser("org-1", "user-1");

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "org-1", memberships: { some: { userId: "user-1" } } },
      }),
    );
  });

  it("scopes member lookup by organization membership", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    mockedGetPrisma.mockReturnValue({ membership: { findMany } } as never);

    await listOrganizationMembers("org-1", "user-1");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          organization: { memberships: { some: { userId: "user-1" } } },
        },
      }),
    );
  });
});
