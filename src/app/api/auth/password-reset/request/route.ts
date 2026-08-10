import { NextResponse } from "next/server";
import { createPasswordResetToken } from "@/features/auth/password-reset";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const email =
    typeof body === "object" && body !== null && "email" in body && typeof body.email === "string"
      ? body.email
      : "";

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    await createPasswordResetToken(email);
    return NextResponse.json({ status: "accepted" }, { status: 202 });
  } catch (error) {
    logger.error("Password reset request failed", error);
    return NextResponse.json({ error: "Unable to process password reset" }, { status: 500 });
  }
}
