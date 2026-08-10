import { NextResponse } from "next/server";
import { resetPassword } from "@/features/auth/password-reset";
import { PasswordValidationError } from "@/features/auth/password";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const token =
    typeof body === "object" && body !== null && "token" in body && typeof body.token === "string"
      ? body.token
      : "";
  const password =
    typeof body === "object" && body !== null && "password" in body && typeof body.password === "string"
      ? body.password
      : "";

  if (!token || !password) {
    return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
  }

  try {
    const reset = await resetPassword(token, password);

    if (!reset) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    return NextResponse.json({ status: "password_reset" });
  } catch (error) {
    if (error instanceof PasswordValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    logger.error("Password reset confirmation failed", error);
    return NextResponse.json({ error: "Unable to reset password" }, { status: 500 });
  }
}
