import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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
  const extension = path.extname(file.name).toLowerCase();
  if ((file.type === "application/pdf" && extension !== ".pdf") || (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && extension !== ".docx")) throw new ResumeValidationError("Resume extension does not match its content type");
}

function storageRoot() {
  return path.resolve(
    /* turbopackIgnore: true */
    process.env.RESUME_STORAGE_PATH ?? "storage/resumes",
  );
}

function s3Config() {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET is required");
  const endpoint = process.env.S3_ENDPOINT;
  const client = new S3Client({
    region: process.env.S3_REGION ?? "auto",
    ...(endpoint
      ? {
          endpoint,
          forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
        }
      : {}),
  });
  return { bucket, client };
}

function isS3Storage() {
  return process.env.RESUME_STORAGE_DRIVER === "s3";
}

function validateStorageKey(storageKey: string) {
  if (!/^[0-9a-f-]{36}\.(pdf|docx)$/i.test(storageKey)) {
    throw new ResumeValidationError("Resume storage key is invalid");
  }
}

export async function saveResume(file: File) {
  validateResumeFile(file);
  const extension = path.extname(file.name).toLowerCase();
  const storageKey = `${randomUUID()}${extension === ".docx" ? ".docx" : ".pdf"}`;
  const contents = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(contents).digest("hex");
  if (isS3Storage()) {
    const { bucket, client } = s3Config();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        Body: contents,
        ContentType: file.type,
        Metadata: { sha256 },
      }),
    );
  } else {
    const root = storageRoot();
    await mkdir(root, { recursive: true });
    await writeFile(
      path.join(/* turbopackIgnore: true */ root, storageKey),
      contents,
      { flag: "wx" },
    );
  }

  return {
    storageKey,
    originalName: file.name.slice(0, 255),
    mimeType: file.type,
    sizeBytes: file.size,
    sha256,
  };
}

export async function removeResume(storageKey: string) {
  validateStorageKey(storageKey);
  if (isS3Storage()) {
    const { bucket, client } = s3Config();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: storageKey }));
    return;
  }
  await rm(
    path.join(
      /* turbopackIgnore: true */
      storageRoot(),
      storageKey,
    ),
    { force: true },
  );
}

export async function readResume(storageKey: string) {
  validateStorageKey(storageKey);
  if (isS3Storage()) {
    const { bucket, client } = s3Config();
    const object = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: storageKey }),
    );
    if (!object.Body) throw new ResumeValidationError("Resume object is empty");
    return Buffer.from(await object.Body.transformToByteArray());
  }
  const root = storageRoot();
  const filePath = path.resolve(root, storageKey);
  const relativePath = path.relative(root, filePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new ResumeValidationError("Resume storage key is invalid");
  }
  return readFile(/* turbopackIgnore: true */ filePath);
}
