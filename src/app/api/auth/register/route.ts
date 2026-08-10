import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { hashPassword } from "@/features/auth/password";
import { createEmailVerificationToken } from "@/features/auth/email-verification";
import {
  RegistrationValidationError,
  validateRegistrationInput,
} from "@/features/auth/registration";

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  let registration;

  try {
    registration = validateRegistrationInput(body);
  } catch (error) {
    if (error instanceof RegistrationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    logger.error("Registration validation failed", error);
    return NextResponse.json({ error: "Invalid registration data" }, { status: 400 });
  }

  try {
    const user = await getPrisma().user.create({
      data: {
        email: registration.email,
        passwordHash: await hashPassword(registration.password),
      },
      select: {
        id: true,
        email: true,
      },
    });

    await createEmailVerificationToken(user.id, user.email);

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "An account with that email already exists" },
        { status: 409 },
      );
    }

    logger.error("User registration failed", error);
    return NextResponse.json({ error: "Unable to create account" }, { status: 500 });
  }
}
