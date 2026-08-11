import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function PATCH(request: Request, context: { params: Promise<{ notificationId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { notificationId } = await context.params;
    const result = await getPrisma().notification.updateMany({ where: { id: notificationId, userId: user.id }, data: { readAt: new Date() } });
    if (result.count === 0) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    return NextResponse.json({ notification: { id: notificationId, readAt: new Date() } });
  } catch (error) {
    logger.error("Notification update failed", error);
    return NextResponse.json({ error: "Unable to update notification" }, { status: 500 });
  }
}
