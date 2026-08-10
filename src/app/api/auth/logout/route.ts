import { NextResponse } from "next/server";
import {
  revokeSession,
  sessionCookieName,
} from "@/features/auth/session";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    await revokeSession(request);

    const response = new NextResponse(null, { status: 204 });
    response.cookies.set({
      name: sessionCookieName,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    logger.error("User logout failed", error);
    return NextResponse.json({ error: "Unable to log out" }, { status: 500 });
  }
}
