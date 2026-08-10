export type OrganizationInput = { name: string };

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
