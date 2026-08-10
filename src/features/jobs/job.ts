export type JobInput = {
  title: string;
  description: string;
};

export class JobValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JobValidationError";
  }
}

export function validateJobInput(input: unknown): JobInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new JobValidationError("Job data must be an object");
  }

  const candidate = input as Record<string, unknown>;
  const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
  const description =
    typeof candidate.description === "string" ? candidate.description.trim() : "";

  if (title.length < 2 || title.length > 200) {
    throw new JobValidationError("Job title must be between 2 and 200 characters");
  }

  if (description.length < 1 || description.length > 10_000) {
    throw new JobValidationError("Job description must be between 1 and 10000 characters");
  }

  return { title, description };
}
