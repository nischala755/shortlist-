import { NextResponse } from "next/server";
import { resendEmailVerification } from "@/features/auth/email-verification";
import { logger } from "@/lib/logger";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const email =
    typeof body === "object" && body !== null && "email" in body && typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";
  if (email.length > 254 || !emailPattern.test(email)) {
    return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
  }

  try {
    await resendEmailVerification(email);
  } catch (error) {
    logger.error("Verification email resend failed", error);
  }
  return NextResponse.json(
    { status: "accepted", message: "If the account requires verification, a new link has been sent." },
    { status: 202 },
  );
}
