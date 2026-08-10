export type ScorecardCriterion = { name: string; rating: number; notes?: string };

export class ScorecardValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScorecardValidationError";
  }
}

export function validateScorecardInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ScorecardValidationError("Scorecard data must be an object");
  const input = value as Record<string, unknown>;
  const criteria = input.criteria;
  const overallRating = input.overallRating;
  const strengths = input.strengths === undefined || input.strengths === null || input.strengths === "" ? null : typeof input.strengths === "string" ? input.strengths.trim() : "invalid";
  const concerns = input.concerns === undefined || input.concerns === null || input.concerns === "" ? null : typeof input.concerns === "string" ? input.concerns.trim() : "invalid";
  const notes = input.notes === undefined || input.notes === null || input.notes === "" ? null : typeof input.notes === "string" ? input.notes.trim() : "invalid";

  if (!Array.isArray(criteria) || criteria.length < 1 || criteria.length > 20) throw new ScorecardValidationError("Scorecard must contain between 1 and 20 criteria");
  if (!Number.isInteger(overallRating) || (overallRating as number) < 1 || (overallRating as number) > 5) throw new ScorecardValidationError("Overall rating must be an integer from 1 to 5");
  const normalizedCriteria: ScorecardCriterion[] = [];
  for (const criterion of criteria) {
    if (!criterion || typeof criterion !== "object") throw new ScorecardValidationError("Each scorecard criterion must be an object");
    const item = criterion as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const rating = item.rating;
    const criterionNotes = item.notes === undefined || item.notes === null || item.notes === "" ? undefined : typeof item.notes === "string" ? item.notes.trim() : "invalid";
    if (name.length < 1 || name.length > 100) throw new ScorecardValidationError("Criterion name must be between 1 and 100 characters");
    if (!Number.isInteger(rating) || (rating as number) < 1 || (rating as number) > 5) throw new ScorecardValidationError("Criterion ratings must be integers from 1 to 5");
    if (criterionNotes === "invalid" || (criterionNotes && criterionNotes.length > 2_000)) throw new ScorecardValidationError("Criterion notes must be at most 2,000 characters");
    normalizedCriteria.push({ name, rating: rating as number, ...(criterionNotes ? { notes: criterionNotes } : {}) });
  }
  for (const [label, value] of [["strengths", strengths], ["concerns", concerns], ["notes", notes]] as const) {
    if (value === "invalid" || (value && value.length > 5_000)) throw new ScorecardValidationError(`${label} must be at most 5,000 characters`);
  }
  return { criteria: normalizedCriteria, overallRating: overallRating as number, strengths, concerns, notes };
}
