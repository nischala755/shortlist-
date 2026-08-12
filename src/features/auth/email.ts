import { createHash } from "node:crypto";

async function deliver(email: string, subject: string, text: string) {
  if (process.env.EMAIL_PROVIDER === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) {
      throw new Error("Resend email configuration is incomplete");
    }

    const idempotencyKey = createHash("sha256")
      .update(`${subject}:${email}:${text}`)
      .digest("hex");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify({ from, to: [email], subject, text }),
    });

    if (!response.ok) {
      throw new Error(`Email provider rejected delivery with status ${response.status}`);
    }
    return;
  }

  if (process.env.APP_ENV === "production") {
    throw new Error("Email delivery is not configured for production");
  }
  console.info(`[email:console] recipient=${email} subject=${subject} body=${text}`);
}

export async function sendVerificationEmail(email: string, token: string) {
  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  await deliver(
    email,
    "Verify your EvidenceHire email",
    `Verify your email: ${baseUrl}/verify-email?token=${token}`,
  );
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  await deliver(
    email,
    "Reset your EvidenceHire password",
    `Reset your password: ${baseUrl}/reset-password?token=${token}`,
  );
}
