import { beforeEach, describe, expect, it, vi } from "vitest";
import { canAccessOrganization } from "./access"; import { getPrisma } from "@/lib/db";
vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));
describe("organization isolation", () => { beforeEach(() => vi.clearAllMocks()); it("does not grant permissions without an exact organization membership", async () => { vi.mocked(getPrisma).mockReturnValue({ membership: { findUnique: vi.fn().mockResolvedValue(null) } } as never); await expect(canAccessOrganization("foreign-org", "user-1", "candidate:read")).resolves.toEqual({ membership: null, allowed: false }); }); });
