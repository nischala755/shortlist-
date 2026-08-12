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
    const unreadCount = await getPrisma().notification.count({ where: { userId: user.id, ...(organizationId ? { organizationId } : {}), readAt: null } });
    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    logger.error("Notification list lookup failed", error);
    return NextResponse.json({ error: "Unable to load notifications" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const body = await request.json() as Record<string, unknown>;
    const organizationId = typeof body.organizationId === "string" ? body.organizationId.trim() : "";
    if (!organizationId) return NextResponse.json({ error: "Organization is required" }, { status: 400 });
    const result = await getPrisma().notification.updateMany({ where: { userId: user.id, organizationId, readAt: null }, data: { readAt: new Date() } });
    return NextResponse.json({ updated: result.count });
  } catch (error) {
    logger.error("Notification bulk update failed", error);
    return NextResponse.json({ error: "Unable to update notifications" }, { status: 500 });
  }
}
