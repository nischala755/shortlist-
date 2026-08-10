import { describe, expect, it } from "vitest";
import {
  OrganizationValidationError,
  validateOrganizationInput,
} from "./organization";

describe("validateOrganizationInput", () => {
  it("trims a valid organization name", () => {
    expect(validateOrganizationInput({ name: "  Acme Hiring  " })).toEqual({
      name: "Acme Hiring",
    });
  });

  it("rejects missing or invalid names", () => {
    expect(() => validateOrganizationInput({})).toThrow(OrganizationValidationError);
    expect(() => validateOrganizationInput({ name: "A" })).toThrow(
      "Organization name must be between 2 and 120 characters",
    );
  });
});
