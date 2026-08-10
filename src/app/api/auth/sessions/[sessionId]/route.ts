import { NextResponse } from "next/server";
import {
  getCurrentUser,
  revokeUserSession,
} from "@/features/auth/session";
import { logger } from "@/lib/logger";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { sessionId } = await context.params;
    const result = await revokeUserSession(user.id, sessionId);

    if (result.count === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error("Session revocation failed", error);
    return NextResponse.json({ error: "Unable to revoke session" }, { status: 500 });
  }
}
