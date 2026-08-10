import { createHash, randomBytes } from "node:crypto";
import { getPrisma } from "@/lib/db";
import { sendVerificationEmail } from "./email";

const verificationLifetimeMs = 1000 * 60 * 60 * 24;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createEmailVerificationToken(userId: string, email: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + verificationLifetimeMs);
  const prisma = getPrisma();

  await prisma.$transaction(async (transaction) => {
    await transaction.emailVerificationToken.deleteMany({ where: { userId } });
    await transaction.emailVerificationToken.create({
      data: { userId, tokenHash: hashToken(token), expiresAt },
    });
  });

  await sendVerificationEmail(email, token);
}

export async function verifyEmailToken(token: string) {
  const prisma = getPrisma();
  const verificationToken = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true },
  });

  if (!verificationToken || verificationToken.expiresAt <= new Date()) {
    return false;
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerifiedAt: new Date() },
    });
    await transaction.emailVerificationToken.delete({
      where: { id: verificationToken.id },
    });
  });

  return true;
}
