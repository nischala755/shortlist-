import { describe, expect, it } from "vitest";
import {
  hashPassword,
  PasswordValidationError,
  validatePassword,
  verifyPassword,
} from "./password";

describe("password handling", () => {
  it("rejects short passwords", () => {
    expect(() => validatePassword("too-short")).toThrow(PasswordValidationError);
  });

  it("accepts passwords at the minimum length", () => {
    expect(() => validatePassword("long-enough-password")).not.toThrow();
  });

  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("correct horse battery staple");

    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(
      true,
    );
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  });

  it("uses a unique salt for each hash", async () => {
    const firstHash = await hashPassword("correct horse battery staple");
    const secondHash = await hashPassword("correct horse battery staple");

    expect(firstHash).not.toBe(secondHash);
  });

  it("rejects malformed stored hashes", async () => {
    await expect(verifyPassword("any password", "not-a-password-hash")).resolves.toBe(
      false,
    );
  });
});
