"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { responseError } from "./auth-form";

type Notification = { id: string; organizationId: string; type: "INTERVIEW_SCHEDULED" | "OFFER_SENT" | "OFFER_RESPONSE" | "ASSESSMENT_ASSIGNED"; title: string; body: string; metadata: unknown; readAt: string | null; createdAt: string };

export function notificationTarget(notification: Notification, candidatePortal: boolean) {
  const metadata = notification.metadata && typeof notification.metadata === "object" && !Array.isArray(notification.metadata) ? notification.metadata as Record<string, unknown> : {};
  if (candidatePortal) return `/portal/organizations/${notification.organizationId}`;
  if (notification.type === "INTERVIEW_SCHEDULED") return `/dashboard/organizations/${notification.organizationId}/interviews`;
  if (notification.type === "OFFER_RESPONSE" || typeof metadata.offerId === "string") return `/dashboard/organizations/${notification.organizationId}/offers`;
  return `/dashboard/organizations/${notification.organizationId}`;
}

export function NotificationCenter({ organizationId, candidatePortal = false }: { organizationId: string; candidatePortal?: boolean }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");
  const panel = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const response = await fetch(`/api/notifications?organizationId=${encodeURIComponent(organizationId)}`, { cache: "no-store" });
      if (!response.ok) { setError(await responseError(response)); return; }
      const body = await response.json() as { notifications: Notification[]; unreadCount: number };
      setNotifications(body.notifications); setUnreadCount(body.unreadCount); setError("");
    } catch { setError("Notifications are temporarily unavailable."); }
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/notifications?organizationId=${encodeURIComponent(organizationId)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseError(response));
        return response.json() as Promise<{ notifications: Notification[]; unreadCount: number }>;
      })
      .then((body) => { setNotifications(body.notifications); setUnreadCount(body.unreadCount); setError(""); })
      .catch((requestError: unknown) => { if (!(requestError instanceof DOMException && requestError.name === "AbortError")) setError(requestError instanceof Error ? requestError.message : "Notifications are temporarily unavailable."); });
    return () => controller.abort();
  }, [organizationId]);
  useEffect(() => {
    function close(event: MouseEvent) { if (panel.current && !panel.current.contains(event.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close);
  }, []);

  async function read(notification: Notification) {
    if (notification.readAt) return;
    const now = new Date().toISOString();
    setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, readAt: now } : item)); setUnreadCount((count) => Math.max(0, count - 1));
    await fetch(`/api/notifications/${notification.id}`, { method: "PATCH" });
  }

  async function readAll() {
    const response = await fetch("/api/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ organizationId }) });
    if (!response.ok) { setError(await responseError(response)); return; }
    const now = new Date().toISOString(); setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt ?? now }))); setUnreadCount(0);
  }

  return <div className="notification-center" ref={panel}><button className="notification-trigger" type="button" aria-label={`${unreadCount} unread notifications`} aria-expanded={open} onClick={() => { setOpen((value) => !value); if (!open) void load(); }}><span aria-hidden="true">N</span>{unreadCount > 0 && <strong>{unreadCount > 99 ? "99+" : unreadCount}</strong>}</button>{open && <section className="notification-panel" aria-label="Notifications"><header><div><strong>Notifications</strong><span>{unreadCount} unread</span></div>{unreadCount > 0 && <button type="button" onClick={readAll}>Mark all read</button>}</header>{error && <p className="notification-error" role="alert">{error}</p>}<div className="notification-list">{notifications.length ? notifications.map((notification) => <Link className={notification.readAt ? "" : "unread"} href={notificationTarget(notification, candidatePortal)} key={notification.id} onClick={() => { void read(notification); setOpen(false); }}><i aria-hidden="true" /><div><strong>{notification.title}</strong><p>{notification.body}</p><time>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(notification.createdAt))}</time></div></Link>) : !error && <p className="notification-empty">No notifications yet.</p>}</div></section>}</div>;
}
