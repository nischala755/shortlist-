import { EvidenceSource } from "@/generated/prisma/client";

export const evidenceSources = Object.values(EvidenceSource);

export class EvidenceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvidenceValidationError";
  }
}

export function validateEvidenceInput(value: unknown) {
  if (!value || typeof value !== "object") throw new EvidenceValidationError("Evidence must be a JSON object");
  const input = value as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const details = typeof input.details === "string" ? input.details.trim() : "";
  const sourceType = typeof input.sourceType === "string" ? input.sourceType : "";
  const sourceReference = input.sourceReference === undefined || input.sourceReference === null
    ? null
    : typeof input.sourceReference === "string" ? input.sourceReference.trim() : "invalid";
  const jobRequirementId = input.jobRequirementId === undefined || input.jobRequirementId === null || input.jobRequirementId === ""
    ? null
    : typeof input.jobRequirementId === "string" ? input.jobRequirementId : "invalid";

  if (title.length < 1 || title.length > 200) throw new EvidenceValidationError("Evidence title must be between 1 and 200 characters");
  if (details.length < 1 || details.length > 10_000) throw new EvidenceValidationError("Evidence details must be between 1 and 10,000 characters");
  if (!evidenceSources.includes(sourceType as EvidenceSource)) throw new EvidenceValidationError("Evidence source is invalid");
  if (sourceReference !== null && (sourceReference === "invalid" || sourceReference.length > 500)) throw new EvidenceValidationError("Evidence source reference must be at most 500 characters");
  if (jobRequirementId === "invalid") throw new EvidenceValidationError("Job requirement ID is invalid");

  return { title, details, sourceType: sourceType as EvidenceSource, sourceReference, jobRequirementId };
}
