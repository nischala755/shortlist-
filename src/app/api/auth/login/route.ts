import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { verifyPassword } from "@/features/auth/password";
import {
  RegistrationValidationError,
  validateRegistrationInput,
} from "@/features/auth/registration";
import {
  createSession,
  sessionCookieName,
  sessionLifetimeSeconds,
} from "@/features/auth/session";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  let credentials;

  try {
    credentials = validateRegistrationInput(body);
  } catch (error) {
    if (error instanceof RegistrationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    logger.error("Login validation failed", error);
    return NextResponse.json({ error: "Invalid login data" }, { status: 400 });
  }

  try {
    const user = await getPrisma().user.findUnique({
      where: { email: credentials.email },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user || !(await verifyPassword(credentials.password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const session = await createSession(user.id);
    const response = NextResponse.json(
      { user: { id: user.id, email: user.email } },
      { status: 200 },
    );

    response.cookies.set({
      name: sessionCookieName,
      value: session.token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionLifetimeSeconds,
    });

    return response;
  } catch (error) {
    logger.error("User login failed", error);
    return NextResponse.json({ error: "Unable to log in" }, { status: 500 });
  }
}
