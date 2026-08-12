export type CandidateInput = {
  name: string;
  email: string;
  phone?: string;
};

export class CandidateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CandidateValidationError";
  }
}

export function validateCandidateInput(input: unknown): CandidateInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new CandidateValidationError("Candidate data must be an object");
  }

  const candidate = input as Record<string, unknown>;
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const email = typeof candidate.email === "string" ? candidate.email.trim().toLowerCase() : "";
  const phone = typeof candidate.phone === "string" ? candidate.phone.trim() : undefined;

  if (name.length < 2 || name.length > 160) {
    throw new CandidateValidationError("Candidate name must be between 2 and 160 characters");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new CandidateValidationError("A valid candidate email is required");
  }

  if (phone && phone.length > 40) {
    throw new CandidateValidationError("Candidate phone must be 40 characters or fewer");
  }

  return { name, email, ...(phone ? { phone } : {}) };
}

export function validateCandidateUpdateInput(input: unknown) {
  const candidate = validateCandidateInput(input);
  const value = input as Record<string, unknown>;
  return { ...candidate, phone: typeof value.phone === "string" && value.phone.trim() ? value.phone.trim() : null };
}
