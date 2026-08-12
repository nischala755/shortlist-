"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type AuthMode = "login" | "register" | "forgot";

const modeConfig = {
  login: { endpoint: "/api/auth/login", submit: "Sign in", pending: "Signing in…" },
  register: { endpoint: "/api/auth/register", submit: "Create account", pending: "Creating account…" },
  forgot: { endpoint: "/api/auth/password-reset/request", submit: "Send reset link", pending: "Sending…" },
} as const;

export async function responseError(response: Response) {
  try {
    const body = await response.json() as { error?: unknown };
    return typeof body.error === "string" ? body.error : "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const config = modeConfig[mode];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const payload = { email: form.get("email"), ...(mode === "forgot" ? {} : { password: form.get("password") }) };

    try {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setMessage({ kind: "error", text: await responseError(response) });
        return;
      }
      if (mode === "login") {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      setMessage({
        kind: "success",
        text: mode === "register" ? "Account created. Check your email for the verification link before signing in." : "If an account exists for that email, a reset link has been sent.",
      });
      event.currentTarget.reset();
    } catch {
      setMessage({ kind: "error", text: "The service is unavailable. Check your connection and try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <label>
        Work email
        <input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@company.com" />
      </label>
      {mode !== "forgot" && (
        <label>
          <span className="label-row">Password {mode === "login" && <Link href="/forgot-password">Forgot password?</Link>}</span>
          <input name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} required minLength={12} maxLength={128} placeholder="At least 12 characters" />
        </label>
      )}
      {message && <p className={`form-message ${message.kind}`} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p>}
      <button className="button primary full" type="submit" disabled={pending}>{pending ? config.pending : config.submit}</button>
    </form>
  );
}
