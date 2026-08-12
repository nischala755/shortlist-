"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { responseError } from "./auth-form";

type JobStatus = "DRAFT" | "PUBLISHED" | "CLOSED";
type Job = { id: string; title: string; description: string; status: JobStatus; createdAt: string; updatedAt: string; applicationCount: number; requirements: Array<{ id: string; title: string; description: string }> };
type JobFilter = "ALL" | JobStatus;

export function filterJobs(jobs: Job[], filter: JobFilter) {
  return filter === "ALL" ? jobs : jobs.filter((job) => job.status === filter);
}

function statusLabel(status: JobStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function JobWorkspace({ organizationId, organizationName, role, canManage, initialJobs, summary }: { organizationId: string; organizationName: string; role: string; canManage: boolean; initialJobs: Job[]; summary: { jobs: number; candidates: number; applications: number; interviews: number } }) {
  const router = useRouter();
  const [filter, setFilter] = useState<JobFilter>("ALL");
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; job?: Job } | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const jobs = useMemo(() => filterJobs(initialJobs, filter), [initialJobs, filter]);
  const base = `/api/organizations/${organizationId}/jobs`;

  async function request(path: string, options: RequestInit) {
    setBusy(path);
    setError("");
    try {
      const response = await fetch(path, options);
      if (!response.ok) { setError(await responseError(response)); return false; }
      router.refresh();
      return true;
    } catch {
      setError("The service is unavailable. Try again shortly.");
      return false;
    } finally {
      setBusy("");
    }
  }

  async function saveJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    const form = new FormData(event.currentTarget);
    const path = editor.mode === "edit" && editor.job ? `${base}/${editor.job.id}` : base;
    const saved = await request(path, { method: editor.mode === "edit" ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: form.get("title"), description: form.get("description") }) });
    if (saved) setEditor(null);
  }

  async function addRequirement(event: FormEvent<HTMLFormElement>, jobId: string) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const saved = await request(`${base}/${jobId}/requirements`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: form.get("title"), description: form.get("description") }) });
    if (saved) formElement.reset();
  }

  return (
    <main className="workspace-main">
      <div className="workspace-title"><div><p className="eyebrow">{organizationName}</p><h1>Jobs</h1><p>Define the role and its evidence criteria before candidates enter the pipeline.</p></div>{canManage && <button className="button primary" type="button" onClick={() => setEditor({ mode: "create" })}>Create job</button>}</div>

      <section className="metric-row" aria-label="Workspace summary"><article><span>Open roles</span><strong>{initialJobs.filter((job) => job.status === "PUBLISHED").length}</strong></article><article><span>Candidates</span><strong>{summary.candidates}</strong></article><article><span>Applications</span><strong>{summary.applications}</strong></article><article><span>Upcoming interviews</span><strong>{summary.interviews}</strong></article></section>

      <div className="job-toolbar"><div className="filter-tabs" role="group" aria-label="Filter jobs">{(["ALL", "DRAFT", "PUBLISHED", "CLOSED"] as JobFilter[]).map((value) => <button className={filter === value ? "active" : ""} type="button" key={value} onClick={() => setFilter(value)}>{value === "ALL" ? `All ${summary.jobs}` : statusLabel(value as JobStatus)}</button>)}</div><span className="role-note">Viewing as {role.replaceAll("_", " ").toLowerCase()}</span></div>
      {error && <p className="form-message error workspace-error" role="alert">{error}</p>}

      {editor && <section className="job-editor" aria-label={editor.mode === "create" ? "Create job" : "Edit job"}><div><p className="eyebrow">{editor.mode === "create" ? "New role" : "Draft role"}</p><h2>{editor.mode === "create" ? "Create a job" : "Edit job"}</h2></div><form onSubmit={saveJob}><label>Job title<input name="title" required minLength={2} maxLength={200} defaultValue={editor.job?.title} placeholder="Senior product engineer" autoFocus /></label><label>Job description<textarea name="description" required maxLength={10000} defaultValue={editor.job?.description} placeholder="Describe the role, outcomes, and working context." /></label><div><button className="button primary" type="submit" disabled={Boolean(busy)}>{busy ? "Saving…" : "Save draft"}</button><button className="button ghost" type="button" onClick={() => setEditor(null)}>Cancel</button></div></form></section>}

      {jobs.length === 0 ? <section className="empty-state compact"><span className="empty-icon" aria-hidden="true">◇</span><h2>No {filter === "ALL" ? "jobs" : statusLabel(filter as JobStatus).toLowerCase() + " jobs"}</h2><p>{canManage ? "Create a draft and add the requirements your team will review against." : "No jobs match this view."}</p></section> : <section className="job-list" aria-label="Jobs">{jobs.map((job) => <article className="job-card" key={job.id}><div className="job-card-heading"><div><span className={`status-pill ${job.status.toLowerCase()}`}>{statusLabel(job.status)}</span><h2>{job.title}</h2><p>{job.description}</p></div><div className="job-count"><strong>{job.applicationCount}</strong><span>applications</span></div></div><div className="job-meta"><span>{job.requirements.length} requirement{job.requirements.length === 1 ? "" : "s"}</span><span>Updated {new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(job.updatedAt))}</span></div><details><summary>Evidence requirements <span aria-hidden="true">⌄</span></summary><div className="requirement-panel">{job.requirements.length > 0 ? <ul>{job.requirements.map((requirement) => <li key={requirement.id}><strong>{requirement.title}</strong><p>{requirement.description}</p></li>)}</ul> : <p className="muted">No evidence requirements have been defined.</p>}{canManage && job.status === "DRAFT" && <form className="requirement-form" onSubmit={(event) => addRequirement(event, job.id)}><label>Requirement title<input name="title" required minLength={2} maxLength={160} placeholder="Production TypeScript" /></label><label>What counts as evidence?<textarea name="description" required maxLength={5000} placeholder="Describe the experience or work sample reviewers should look for." /></label><button className="button secondary" type="submit" disabled={Boolean(busy)}>Add requirement</button></form>}</div></details>{canManage && <div className="job-actions">{job.status === "DRAFT" && <><button className="button secondary small" type="button" onClick={() => setEditor({ mode: "edit", job })}>Edit</button><button className="button primary small" type="button" disabled={Boolean(busy)} onClick={() => request(`${base}/${job.id}/publish`, { method: "POST" })}>Publish</button></>}{job.status === "PUBLISHED" && <button className="button secondary small" type="button" disabled={Boolean(busy)} onClick={() => request(`${base}/${job.id}/close`, { method: "POST" })}>Close job</button>}</div>}</article>)}</section>}
    </main>
  );
}
