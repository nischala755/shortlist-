import { describe, expect, it } from "vitest";
import { parseResumeText, ResumeParsingError } from "./parser";
import { ResumeValidationError } from "./storage";

describe("parseResumeText", () => {
  it("rejects unsupported file types before parsing", async () => {
    await expect(parseResumeText("text/plain", Buffer.from("resume"))).rejects.toBeInstanceOf(ResumeValidationError);
  });

  it("rejects empty content", async () => {
    await expect(parseResumeText("application/pdf", Buffer.alloc(0))).rejects.toBeInstanceOf(ResumeValidationError);
  });

  it("reports malformed PDF content as a parsing error", async () => {
    await expect(parseResumeText("application/pdf", Buffer.from("not a pdf"))).rejects.toBeInstanceOf(ResumeParsingError);
  });

  it("reports malformed DOCX content as a parsing error", async () => {
    await expect(
      parseResumeText("application/vnd.openxmlformats-officedocument.wordprocessingml.document", Buffer.from("not a docx")),
    ).rejects.toBeInstanceOf(ResumeParsingError);
  });
});
