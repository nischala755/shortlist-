import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId") ?? undefined;
    const unreadOnly = url.searchParams.get("unread") === "true";
    const notifications = await getPrisma().notification.findMany({
      where: { userId: user.id, ...(organizationId ? { organizationId } : {}), ...(unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, organizationId: true, type: true, title: true, body: true, metadata: true, readAt: true, createdAt: true },
    });
    return NextResponse.json({ notifications });
  } catch (error) {
    logger.error("Notification list lookup failed", error);
    return NextResponse.json({ error: "Unable to load notifications" }, { status: 500 });
  }
}
