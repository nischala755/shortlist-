"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { responseError } from "./auth-form";

export function CreateOrganizationForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/organizations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: form.get("name") }) });
      if (!response.ok) { setError(await responseError(response)); return; }
      setOpen(false);
      router.refresh();
    } catch {
      setError("The service is unavailable. Try again shortly.");
    } finally {
      setPending(false);
    }
  }

  if (!open) return <button className="button primary" type="button" onClick={() => setOpen(true)}>Create organization</button>;
  return <form className="inline-form" onSubmit={submit}><label><span className="sr-only">Organization name</span><input name="name" required minLength={2} maxLength={120} autoFocus placeholder="Organization name" /></label><button className="button primary" type="submit" disabled={pending}>{pending ? "Creating…" : "Create"}</button><button className="button ghost" type="button" onClick={() => setOpen(false)}>Cancel</button>{error && <p className="form-message error" role="alert">{error}</p>}</form>;
}
