import { CodingAssessmentStatus } from "@/generated/prisma/client";

export class AssessmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssessmentValidationError";
  }
}

export function validateAssessmentInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AssessmentValidationError("Assessment data must be an object");
  const input = value as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const instructions = typeof input.instructions === "string" ? input.instructions.trim() : "";
  const durationMinutes = input.durationMinutes;
  if (title.length < 1 || title.length > 200) throw new AssessmentValidationError("Assessment title must be between 1 and 200 characters");
  if (instructions.length < 1 || instructions.length > 20_000) throw new AssessmentValidationError("Assessment instructions must be between 1 and 20,000 characters");
  if (!Number.isInteger(durationMinutes) || (durationMinutes as number) < 5 || (durationMinutes as number) > 240) throw new AssessmentValidationError("Duration must be between 5 and 240 minutes");
  return { title, instructions, durationMinutes: durationMinutes as number };
}

export function validateAssessmentPatch(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AssessmentValidationError("Assessment data must be an object");
  const input = value as Record<string, unknown>;
  const patch: { title?: string; instructions?: string; durationMinutes?: number } = {};
  if (input.title !== undefined) {
    const title = typeof input.title === "string" ? input.title.trim() : "";
    if (title.length < 1 || title.length > 200) throw new AssessmentValidationError("Assessment title must be between 1 and 200 characters");
    patch.title = title;
  }
  if (input.instructions !== undefined) {
    const instructions = typeof input.instructions === "string" ? input.instructions.trim() : "";
    if (instructions.length < 1 || instructions.length > 20_000) throw new AssessmentValidationError("Assessment instructions must be between 1 and 20,000 characters");
    patch.instructions = instructions;
  }
  if (input.durationMinutes !== undefined) {
    if (!Number.isInteger(input.durationMinutes) || (input.durationMinutes as number) < 5 || (input.durationMinutes as number) > 240) throw new AssessmentValidationError("Duration must be between 5 and 240 minutes");
    patch.durationMinutes = input.durationMinutes as number;
  }
  return patch;
}

export function validateAssessmentStatus(value: unknown) {
  if (typeof value !== "string" || !Object.values(CodingAssessmentStatus).includes(value as CodingAssessmentStatus)) throw new AssessmentValidationError("Assessment status is invalid");
  return value as CodingAssessmentStatus;
}

export function canTransitionAssessmentStatus(current: CodingAssessmentStatus, next: CodingAssessmentStatus) {
  return (current === "DRAFT" && next === "ASSIGNED") || (current === "ASSIGNED" && next === "CLOSED");
}

export function validateQuestionInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AssessmentValidationError("Question data must be an object");
  const input = value as Record<string, unknown>;
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  const language = input.language === undefined || input.language === null || input.language === "" ? null : typeof input.language === "string" ? input.language.trim() : "invalid";
  const starterCode = input.starterCode === undefined || input.starterCode === null || input.starterCode === "" ? null : typeof input.starterCode === "string" ? input.starterCode : "invalid";
  const points = input.points === undefined ? 1 : input.points;
  if (prompt.length < 1 || prompt.length > 20_000) throw new AssessmentValidationError("Question prompt must be between 1 and 20,000 characters");
  if (language === "invalid" || (language && language.length > 50)) throw new AssessmentValidationError("Question language must be at most 50 characters");
  if (starterCode === "invalid" || (starterCode && starterCode.length > 20_000)) throw new AssessmentValidationError("Starter code must be at most 20,000 characters");
  if (!Number.isInteger(points) || (points as number) < 1 || (points as number) > 100) throw new AssessmentValidationError("Question points must be between 1 and 100");
  return { prompt, language, starterCode, points: points as number };
}
