"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { responseError } from "./auth-form";

export function VerifyEmailForm({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  async function verify() {
    if (!token) {
      setMessage({ kind: "error", text: "This verification link is missing its token." });
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/auth/verify-email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
      if (!response.ok) setMessage({ kind: "error", text: await responseError(response) });
      else setMessage({ kind: "success", text: "Email verified. You can now sign in." });
    } catch {
      setMessage({ kind: "error", text: "The service is unavailable. Try again shortly." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="form-stack">
      {message && <p className={`form-message ${message.kind}`} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p>}
      {message?.kind === "success" ? <Link className="button primary full" href="/login">Continue to sign in</Link> : <button className="button primary full" type="button" onClick={verify} disabled={pending}>{pending ? "Verifying…" : "Verify email"}</button>}
    </div>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setMessage({ kind: "error", text: "This reset link is missing its token." });
      return;
    }
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const password = form.get("password");
    const confirmation = form.get("confirmation");
    if (password !== confirmation) {
      setMessage({ kind: "error", text: "The passwords do not match." });
      setPending(false);
      return;
    }
    try {
      const response = await fetch("/api/auth/password-reset/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, password }) });
      if (!response.ok) setMessage({ kind: "error", text: await responseError(response) });
      else setMessage({ kind: "success", text: "Password updated. All previous sessions have been signed out." });
    } catch {
      setMessage({ kind: "error", text: "The service is unavailable. Try again shortly." });
    } finally {
      setPending(false);
    }
  }

  if (message?.kind === "success") return <div className="form-stack"><p className="form-message success" role="status">{message.text}</p><Link className="button primary full" href="/login">Sign in with new password</Link></div>;

  return (
    <form className="form-stack" onSubmit={submit}>
      <label>New password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
      <label>Confirm new password<input name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
      {message && <p className="form-message error" role="alert">{message.text}</p>}
      <button className="button primary full" type="submit" disabled={pending}>{pending ? "Updating…" : "Update password"}</button>
    </form>
  );
}
