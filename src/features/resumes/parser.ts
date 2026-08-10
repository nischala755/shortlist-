import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { allowedResumeMimeTypes, maxResumeSizeBytes, ResumeValidationError } from "./storage";

const docxMimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export class ResumeParsingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeParsingError";
  }
}

function normalizeText(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function parseResumeText(mimeType: string, contents: Buffer) {
  if (!allowedResumeMimeTypes.includes(mimeType as (typeof allowedResumeMimeTypes)[number])) {
    throw new ResumeValidationError("Only PDF and DOCX resumes are supported");
  }
  if (contents.length === 0 || contents.length > maxResumeSizeBytes) {
    throw new ResumeValidationError("Resume file must be between 1 byte and 10 MB");
  }

  try {
    if (mimeType === "application/pdf") {
      const parser = new PDFParse({ data: contents });
      try {
        const result = await parser.getText();
        return normalizeText(result.text);
      } finally {
        await parser.destroy();
      }
    }

    if (mimeType === docxMimeType) {
      const result = await mammoth.extractRawText({ buffer: contents });
      return normalizeText(result.value);
    }

    throw new ResumeParsingError("Resume format is not supported by the parser");
  } catch (error) {
    if (error instanceof ResumeValidationError || error instanceof ResumeParsingError) throw error;
    throw new ResumeParsingError("Resume contents could not be parsed");
  }
}
