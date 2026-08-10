import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;

function deriveKey(
  password: string,
  salt: Buffer,
  options: { N: number; r: number; p: number },
) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, KEY_LENGTH, options, (error, derivedKey) => {
      if (error) {
        reject(error);
      } else {
        resolve(derivedKey as Buffer);
      }
    });
  });
}

export class PasswordValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordValidationError";
  }
}

export function validatePassword(password: unknown): asserts password is string {
  if (typeof password !== "string" || password.length < 12) {
    throw new PasswordValidationError("Password must be at least 12 characters");
  }
}

export async function hashPassword(password: string) {
  validatePassword(password);

  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = await deriveKey(password, salt, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
  });

  return [
    "scrypt",
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, storedHash: string) {
  if (!storedHash.startsWith("scrypt$")) {
    return false;
  }

  const [, cost, blockSize, parallelization, encodedSalt, encodedKey] =
    storedHash.split("$");
  const salt = Buffer.from(encodedSalt ?? "", "base64url");
  const expectedKey = Buffer.from(encodedKey ?? "", "base64url");

  if (
    !cost ||
    !blockSize ||
    !parallelization ||
    salt.length !== SALT_LENGTH ||
    expectedKey.length !== KEY_LENGTH
  ) {
    return false;
  }

  const derivedKey = await deriveKey(password, salt, {
    N: Number(cost),
    r: Number(blockSize),
    p: Number(parallelization),
  });

  return timingSafeEqual(derivedKey, expectedKey);
}
