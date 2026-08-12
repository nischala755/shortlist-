"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { responseError } from "./auth-form";

const roles = ["ADMIN", "RECRUITER", "HIRING_MANAGER", "INTERVIEWER", "CANDIDATE"] as const;
type Member = { id: string; createdAt: string; role: string; user: { id: string; email: string } };

export function TeamWorkspace({ organizationId, organizationName, canManage, currentUserId, members }: { organizationId: string; organizationName: string; canManage: boolean; currentUserId: string; members: Member[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  async function request(path: string, options: RequestInit) {
    setBusy(path); setError("");
    try { const response = await fetch(path, options); if (!response.ok) { setError(await responseError(response)); return false; } router.refresh(); return true; }
    catch { setError("The service is unavailable. Try again shortly."); return false; }
    finally { setBusy(""); }
  }
  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    const saved = await request(`/api/organizations/${organizationId}/members`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: form.get("email"), role: form.get("role") }) });
    if (saved) formElement.reset();
  }
  return <main className="workspace-main team-main"><div className="workspace-title"><div><p className="eyebrow">{organizationName}</p><h1>Team</h1><p>Provision verified accounts and keep organization responsibilities explicit.</p></div></div>{error && <p className="form-message error workspace-error" role="alert">{error}</p>}{canManage && <section className="member-invite"><div><h2>Add a registered user</h2><p>The user must register and verify their email first. This does not send an invitation email.</p></div><form onSubmit={addMember}><label>Email<input name="email" type="email" required maxLength={254} placeholder="reviewer@example.com" /></label><label>Role<select name="role" defaultValue="INTERVIEWER">{roles.map((role) => <option key={role} value={role}>{role.replaceAll("_", " ").toLowerCase()}</option>)}</select></label><button className="button primary" type="submit" disabled={Boolean(busy)}>Add member</button></form></section>}<section className="member-table" aria-label="Organization members"><header><span>Account</span><span>Role</span><span>Joined</span></header>{members.map((member) => <article key={member.id}><div><span className="candidate-avatar">{member.user.email.slice(0, 2).toUpperCase()}</span><div><strong>{member.user.email}</strong>{member.user.id === currentUserId && <small>You</small>}</div></div><div>{canManage ? <select aria-label={`Role for ${member.user.email}`} value={member.role} disabled={Boolean(busy)} onChange={(event) => request(`/api/organizations/${organizationId}/members/${member.user.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ role: event.target.value }) })}>{roles.map((role) => <option key={role} value={role}>{role.replaceAll("_", " ").toLowerCase()}</option>)}</select> : <span>{member.role.replaceAll("_", " ").toLowerCase()}</span>}</div><time>{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(member.createdAt))}</time></article>)}</section><p className="team-note">At least one administrator must remain in the organization. Candidate-role members receive portal-only access.</p></main>;
}
