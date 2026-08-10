export async function sendVerificationEmail(email: string, token: string) {
  if (process.env.APP_ENV === "production") {
    throw new Error("Email delivery is not configured for production");
  }

  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  console.info(
    `[email:verification] recipient=${email} url=${baseUrl}/verify-email?token=${token}`,
  );
}

export async function sendPasswordResetEmail(email: string, token: string) {
  if (process.env.APP_ENV === "production") {
    throw new Error("Email delivery is not configured for production");
  }

  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  console.info(
    `[email:password-reset] recipient=${email} url=${baseUrl}/reset-password?token=${token}`,
  );
}
