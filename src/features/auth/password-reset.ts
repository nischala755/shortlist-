import { createHash, randomBytes } from "node:crypto";
import { getPrisma } from "@/lib/db";
import { hashPassword, validatePassword } from "./password";
import { sendPasswordResetEmail } from "./email";

const passwordResetLifetimeMs = 1000 * 60 * 60;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(email: string) {
  const user = await getPrisma().user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, email: true },
  });

  if (!user) {
    return;
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + passwordResetLifetimeMs);
  const prisma = getPrisma();

  await prisma.$transaction(async (transaction) => {
    await transaction.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await transaction.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
    });
  });

  await sendPasswordResetEmail(user.email, token);
}

export async function resetPassword(token: string, password: string) {
  validatePassword(password);

  const prisma = getPrisma();
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true },
  });

  if (!resetToken || resetToken.expiresAt <= new Date()) {
    return false;
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    });
    await transaction.passwordResetToken.delete({ where: { id: resetToken.id } });
    await transaction.session.deleteMany({ where: { userId: resetToken.userId } });
  });

  return true;
}
