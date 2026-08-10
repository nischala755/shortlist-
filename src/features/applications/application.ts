export type ApplicationInput = { jobId: string; candidateId: string };

export const applicationStages = [
  "APPLIED",
  "SCREENING",
  "SHORTLISTED",
  "ASSESSMENT",
  "INTERVIEW",
  "OFFER",
  "HIRED",
] as const;

export type ApplicationStageValue = (typeof applicationStages)[number];

const allowedTransitions: Record<ApplicationStageValue, readonly ApplicationStageValue[]> = {
  APPLIED: ["SCREENING"],
  SCREENING: ["SHORTLISTED"],
  SHORTLISTED: ["ASSESSMENT", "INTERVIEW"],
  ASSESSMENT: ["INTERVIEW"],
  INTERVIEW: ["OFFER"],
  OFFER: ["HIRED"],
  HIRED: [],
};

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

export function validateApplicationStage(value: unknown): ApplicationStageValue {
  if (typeof value === "string" && applicationStages.includes(value as ApplicationStageValue)) {
    return value as ApplicationStageValue;
  }

  throw new ApplicationValidationError("A valid application stage is required");
}

export function canTransitionApplicationStage(
  current: ApplicationStageValue,
  next: ApplicationStageValue,
) {
  return allowedTransitions[current].includes(next);
}
