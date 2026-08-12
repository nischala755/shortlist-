import { describe, expect, it } from "vitest";
import { ResumeValidationError, validateResumeFile } from "./storage";

describe("validateResumeFile", () => {
  it("accepts PDF and DOCX files", () => {
    expect(() => validateResumeFile(new File(["pdf"], "resume.pdf", { type: "application/pdf" }))).not.toThrow();
    expect(() => validateResumeFile(new File(["docx"], "resume.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }))).not.toThrow();
  });

  it("rejects unsupported types", () => {
    expect(() => validateResumeFile(new File(["text"], "resume.txt", { type: "text/plain" }))).toThrow(ResumeValidationError);
  });

  it("rejects a misleading file extension", () => {
    expect(() => validateResumeFile(new File(["pdf"], "resume.docx", { type: "application/pdf" }))).toThrow(ResumeValidationError);
  });
});
