export type ApplicationInput = { jobId: string; candidateId: string };

export class ApplicationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationValidationError";
  }
}

export function validateApplicationInput(input: unknown): ApplicationInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ApplicationValidationError("Application data must be an object");
  }

  const candidate = input as Record<string, unknown>;
  const jobId = typeof candidate.jobId === "string" ? candidate.jobId.trim() : "";
  const candidateId = typeof candidate.candidateId === "string" ? candidate.candidateId.trim() : "";

  if (!jobId || !candidateId) {
    throw new ApplicationValidationError("Job and candidate are required");
  }

  return { jobId, candidateId };
}
