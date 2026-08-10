import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    logger.error("Authenticated user lookup failed", error);
    return NextResponse.json({ error: "Unable to verify session" }, { status: 500 });
  }
}
