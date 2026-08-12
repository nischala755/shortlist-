"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function logout() {
    setPending(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); } finally { router.push("/login"); router.refresh(); }
  }
  return <button className="button secondary small" type="button" onClick={logout} disabled={pending}>{pending ? "Signing out…" : "Sign out"}</button>;
}
