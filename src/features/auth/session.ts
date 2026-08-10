import { createHash, randomBytes } from "node:crypto";
import { getPrisma } from "@/lib/db";

export const sessionCookieName = "evidencehire_session";
export const sessionLifetimeSeconds = 60 * 60 * 24 * 30;

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getSessionToken(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${sessionCookieName}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(sessionCookieName.length + 1));
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

export async function getCurrentUser(request: Request) {
  const token = getSessionToken(request);

  if (!token) {
    return null;
  }

  const session = await getPrisma().session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: {
      expiresAt: true,
      user: { select: { id: true, email: true } },
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return session.user;
}

export async function revokeSession(request: Request) {
  const token = getSessionToken(request);

  if (!token) {
    return;
  }

  await getPrisma().session.deleteMany({
    where: { tokenHash: hashSessionToken(token) },
  });
}
