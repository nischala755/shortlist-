import { NextResponse } from "next/server";
import { verifyEmailToken } from "@/features/auth/email-verification";
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

  if (!token) {
    return NextResponse.json({ error: "Verification token is required" }, { status: 400 });
  }

  try {
    const verified = await verifyEmailToken(token);

    if (!verified) {
      return NextResponse.json({ error: "Invalid or expired verification token" }, { status: 400 });
    }

    return NextResponse.json({ status: "verified" });
  } catch (error) {
    logger.error("Email verification failed", error);
    return NextResponse.json({ error: "Unable to verify email" }, { status: 500 });
  }
}
