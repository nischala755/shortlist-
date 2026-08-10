export type OrganizationInput = { name: string };

export const organizationRoles = [
  "CANDIDATE",
  "RECRUITER",
  "HIRING_MANAGER",
  "INTERVIEWER",
  "ADMIN",
] as const;

export type OrganizationRole = (typeof organizationRoles)[number];

export function validateOrganizationRole(value: unknown): OrganizationRole {
  if (typeof value === "string" && organizationRoles.includes(value as OrganizationRole)) {
    return value as OrganizationRole;
  }

  throw new OrganizationValidationError("A valid organization role is required");
}

export class OrganizationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrganizationValidationError";
  }
}

export function validateOrganizationInput(input: unknown): OrganizationInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new OrganizationValidationError("Organization data must be an object");
  }

  const name =
    "name" in input && typeof input.name === "string" ? input.name.trim() : "";

  if (name.length < 2 || name.length > 120) {
    throw new OrganizationValidationError(
      "Organization name must be between 2 and 120 characters",
    );
  }

  return { name };
}
