import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPrisma } from "@/lib/db";
import { sendVerificationEmail } from "./email";
import { resendEmailVerification } from "./email-verification";

vi.mock("@/lib/db", () => ({ getPrisma: vi.fn() }));
vi.mock("./email", () => ({ sendVerificationEmail: vi.fn() }));

describe("email verification recovery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does nothing for unknown or already verified accounts", async () => {
    vi.mocked(getPrisma).mockReturnValue({
      user: { findUnique: vi.fn().mockResolvedValue(null) },
    } as never);
    await resendEmailVerification("unknown@example.com");
    expect(sendVerificationEmail).not.toHaveBeenCalled();

    vi.mocked(getPrisma).mockReturnValue({
      user: { findUnique: vi.fn().mockResolvedValue({ id: "user-1", email: "known@example.com", emailVerifiedAt: new Date() }) },
    } as never);
    await resendEmailVerification("known@example.com");
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("replaces the token and emails an unverified account", async () => {
    const transaction = {
      emailVerificationToken: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue({ id: "token-1" }),
      },
    };
    vi.mocked(getPrisma).mockReturnValue({
      user: { findUnique: vi.fn().mockResolvedValue({ id: "user-1", email: "person@example.com", emailVerifiedAt: null }) },
      $transaction: vi.fn(async (callback) => callback(transaction)),
    } as never);

    await resendEmailVerification(" Person@Example.com ");

    expect(transaction.emailVerificationToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      "person@example.com",
      expect.any(String),
    );
  });
});
