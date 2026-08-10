import { validatePassword } from "./password";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RegistrationInput = {
  email: string;
  password: string;
};

export class RegistrationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistrationValidationError";
  }
}

export function validateRegistrationInput(input: unknown): RegistrationInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new RegistrationValidationError("Registration data must be an object");
  }

  const candidate = input as Record<string, unknown>;
  const email = typeof candidate.email === "string" ? candidate.email.trim() : "";
  const password = candidate.password;

  if (email.length > 254 || !emailPattern.test(email)) {
    throw new RegistrationValidationError("A valid email address is required");
  }

  validatePassword(password);

  return {
    email: email.toLowerCase(),
    password,
  };
}
