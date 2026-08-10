import { createHash, randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export const maxResumeSizeBytes = 10 * 1024 * 1024;
export const allowedResumeMimeTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export class ResumeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeValidationError";
  }
}

export function validateResumeFile(file: File) {
  if (!allowedResumeMimeTypes.includes(file.type as (typeof allowedResumeMimeTypes)[number])) {
    throw new ResumeValidationError("Only PDF and DOCX resumes are supported");
  }
  if (file.size === 0 || file.size > maxResumeSizeBytes) {
    throw new ResumeValidationError("Resume file must be between 1 byte and 10 MB");
  }
}

function storageRoot() {
  return path.resolve(process.env.RESUME_STORAGE_PATH ?? "storage/resumes");
}

export async function saveResume(file: File) {
  validateResumeFile(file);
  const extension = path.extname(file.name).toLowerCase();
  const storageKey = `${randomUUID()}${extension === ".docx" ? ".docx" : ".pdf"}`;
  const contents = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(contents).digest("hex");
  const root = storageRoot();

  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, storageKey), contents, { flag: "wx" });

  return {
    storageKey,
    originalName: file.name.slice(0, 255),
    mimeType: file.type,
    sizeBytes: file.size,
    sha256,
  };
}

export async function removeResume(storageKey: string) {
  await rm(path.join(storageRoot(), storageKey), { force: true });
}
