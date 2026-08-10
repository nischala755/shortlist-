import { createHash, randomBytes } from "node:crypto";
import { getPrisma } from "@/lib/db";

export const sessionCookieName = "evidencehire_session";
export const sessionLifetimeSeconds = 60 * 60 * 24 * 30;

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionLifetimeSeconds * 1000);

  await getPrisma().session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
    },
  });

  return { token, expiresAt };
}
