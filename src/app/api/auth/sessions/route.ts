import { NextResponse } from "next/server";
import {
  getCurrentUser,
  listUserSessions,
} from "@/features/auth/session";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    return NextResponse.json({ sessions: await listUserSessions(user.id) });
  } catch (error) {
    logger.error("Session list lookup failed", error);
    return NextResponse.json({ error: "Unable to list sessions" }, { status: 500 });
  }
}
