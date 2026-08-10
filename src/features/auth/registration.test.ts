import { describe, expect, it } from "vitest";
import {
  RegistrationValidationError,
  validateRegistrationInput,
} from "./registration";

describe("validateRegistrationInput", () => {
  it("normalizes a valid email address", () => {
    expect(
      validateRegistrationInput({
        email: "  Recruiter@Example.COM ",
        password: "correct horse battery staple",
      }),
    ).toEqual({
      email: "recruiter@example.com",
      password: "correct horse battery staple",
    });
  });

  it("rejects malformed input", () => {
    expect(() => validateRegistrationInput(null)).toThrow(
      RegistrationValidationError,
    );
    expect(() => validateRegistrationInput({ email: "not-an-email" })).toThrow(
      RegistrationValidationError,
    );
  });

  it("rejects an email that is too long", () => {
    const email = `${"a".repeat(245)}@example.com`;

    expect(() =>
      validateRegistrationInput({
        email,
        password: "correct horse battery staple",
      }),
    ).toThrow("A valid email address is required");
  });

  it("delegates password policy validation", () => {
    expect(() =>
      validateRegistrationInput({
        email: "recruiter@example.com",
        password: "too-short",
      }),
    ).toThrow("Password must be at least 12 characters");
  });
});
