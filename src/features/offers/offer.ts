import { OfferStatus } from "@/generated/prisma/client";

export class OfferValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OfferValidationError";
  }
}

export function validateOfferInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new OfferValidationError("Offer data must be an object");
  const input = value as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const details = typeof input.details === "string" ? input.details.trim() : "";
  const compensationDetails = input.compensationDetails === undefined || input.compensationDetails === null || input.compensationDetails === "" ? null : typeof input.compensationDetails === "string" ? input.compensationDetails.trim() : "invalid";
  const expiresAt = input.expiresAt === undefined || input.expiresAt === null || input.expiresAt === "" ? null : typeof input.expiresAt === "string" ? new Date(input.expiresAt) : new Date(NaN);
  if (title.length < 1 || title.length > 200) throw new OfferValidationError("Offer title must be between 1 and 200 characters");
  if (details.length < 1 || details.length > 20_000) throw new OfferValidationError("Offer details must be between 1 and 20,000 characters");
  if (compensationDetails === "invalid" || (compensationDetails && compensationDetails.length > 500)) throw new OfferValidationError("Compensation details must be at most 500 characters");
  if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date())) throw new OfferValidationError("Offer expiry must be a valid future date");
  return { title, details, compensationDetails, expiresAt };
}

export function validateOfferPatch(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new OfferValidationError("Offer data must be an object");
  const input = value as Record<string, unknown>;
  const patch: { title?: string; details?: string; compensationDetails?: string | null; expiresAt?: Date | null } = {};
  if (input.title !== undefined) {
    const title = typeof input.title === "string" ? input.title.trim() : "";
    if (title.length < 1 || title.length > 200) throw new OfferValidationError("Offer title must be between 1 and 200 characters");
    patch.title = title;
  }
  if (input.details !== undefined) {
    const details = typeof input.details === "string" ? input.details.trim() : "";
    if (details.length < 1 || details.length > 20_000) throw new OfferValidationError("Offer details must be between 1 and 20,000 characters");
    patch.details = details;
  }
  if (input.compensationDetails !== undefined) {
    const compensationDetails = input.compensationDetails === null || input.compensationDetails === "" ? null : typeof input.compensationDetails === "string" ? input.compensationDetails.trim() : "invalid";
    if (compensationDetails === "invalid" || (compensationDetails && compensationDetails.length > 500)) throw new OfferValidationError("Compensation details must be at most 500 characters");
    patch.compensationDetails = compensationDetails;
  }
  if (input.expiresAt !== undefined) {
    const expiresAt = input.expiresAt === null || input.expiresAt === "" ? null : typeof input.expiresAt === "string" ? new Date(input.expiresAt) : new Date(NaN);
    if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date())) throw new OfferValidationError("Offer expiry must be a valid future date");
    patch.expiresAt = expiresAt;
  }
  return patch;
}

export function validateOfferStatus(value: unknown) {
  if (typeof value !== "string" || !Object.values(OfferStatus).includes(value as OfferStatus)) throw new OfferValidationError("Offer status is invalid");
  return value as OfferStatus;
}

export function validateCandidateOfferDecision(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new OfferValidationError("Offer response must be an object");
  const input = value as Record<string, unknown>;
  if (input.status !== "ACCEPTED" && input.status !== "DECLINED") throw new OfferValidationError("Offer response must be ACCEPTED or DECLINED");
  const responseNote = input.responseNote === undefined || input.responseNote === null || input.responseNote === "" ? null : typeof input.responseNote === "string" ? input.responseNote.trim() : "invalid";
  if (responseNote === "invalid" || (responseNote && responseNote.length > 5_000)) throw new OfferValidationError("Response note must be at most 5,000 characters");
  return { status: input.status as "ACCEPTED" | "DECLINED", responseNote };
}
