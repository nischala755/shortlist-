"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { responseError } from "./auth-form";

type Resume = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  parsedAt: string | null;
  createdAt: string;
};

type Application = {
  id: string;
  currentStage: string;
  createdAt: string;
  job: { id: string; title: string };
};

type Candidate = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  resumes: Resume[];
  applications: Application[];
};

export function searchCandidates(candidates: Candidate[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return candidates;
  return candidates.filter(
    (candidate) =>
      candidate.name.toLowerCase().includes(normalized) ||
      candidate.email.toLowerCase().includes(normalized),
  );
}

function fileSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function CandidateWorkspace({
  organizationId,
  organizationName,
  canManage,
  canCreateApplication,
  publishedJobs,
  initialCandidates,
}: {
  organizationId: string;
  organizationName: string;
  canManage: boolean;
  canCreateApplication: boolean;
  publishedJobs: Array<{ id: string; title: string }>;
  initialCandidates: Candidate[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initialCandidates[0]?.id ?? "");
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; candidate?: Candidate } | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const candidates = useMemo(() => searchCandidates(initialCandidates, query), [initialCandidates, query]);
  const selected = initialCandidates.find((candidate) => candidate.id === selectedId) ?? candidates[0];
  const availableJobs = selected
    ? publishedJobs.filter(
        (job) => !selected.applications.some((application) => application.job.id === job.id),
      )
    : [];
  const base = `/api/organizations/${organizationId}`;

  async function request(path: string, options: RequestInit) {
    setBusy(path);
    setError("");
    try {
      const response = await fetch(path, options);
      if (!response.ok) {
        setError(await responseError(response));
        return null;
      }
      const body = response.status === 204 ? null : await response.json();
      router.refresh();
      return body;
    } catch {
      setError("The service is unavailable. Try again shortly.");
      return null;
    } finally {
      setBusy("");
    }
  }

  async function saveCandidate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    const form = new FormData(event.currentTarget);
    const path =
      editor.mode === "edit" && editor.candidate
        ? `${base}/candidates/${editor.candidate.id}`
        : `${base}/candidates`;
    const body = await request(path, {
      method: editor.mode === "edit" ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), email: form.get("email"), phone: form.get("phone") }),
    });
    if (body?.candidate) {
      setSelectedId(body.candidate.id);
      setEditor(null);
    }
  }

  async function uploadResume(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const formElement = event.currentTarget;
    const body = await request(`${base}/candidates/${selected.id}/resumes`, {
      method: "POST",
      body: new FormData(formElement),
    });
    if (body?.resume) formElement.reset();
  }

  async function createApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    await request(`${base}/applications`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ candidateId: selected.id, jobId: form.get("jobId") }),
    });
  }

  return (
    <main className="workspace-main candidate-main">
      <div className="workspace-title">
        <div>
          <p className="eyebrow">{organizationName}</p>
          <h1>Candidates</h1>
          <p>Keep profile, resume, and application context together from the first review.</p>
        </div>
        {canManage && (
          <button className="button primary" type="button" onClick={() => setEditor({ mode: "create" })}>
            Add candidate
          </button>
        )}
      </div>

      {error && <p className="form-message error workspace-error" role="alert">{error}</p>}

      {editor && (
        <section className="job-editor candidate-editor" aria-label={editor.mode === "create" ? "Add candidate" : "Edit candidate"}>
          <div><p className="eyebrow">Candidate profile</p><h2>{editor.mode === "create" ? "Add a candidate" : "Edit profile"}</h2></div>
          <form onSubmit={saveCandidate}>
            <div className="field-pair">
              <label>Full name<input name="name" required minLength={2} maxLength={160} defaultValue={editor.candidate?.name} autoFocus /></label>
              <label>Email<input name="email" type="email" required maxLength={254} defaultValue={editor.candidate?.email} /></label>
            </div>
            <label>Phone <span className="optional">Optional</span><input name="phone" type="tel" maxLength={40} defaultValue={editor.candidate?.phone ?? ""} /></label>
            <div><button className="button primary" type="submit" disabled={Boolean(busy)}>{busy ? "Saving..." : "Save candidate"}</button><button className="button ghost" type="button" onClick={() => setEditor(null)}>Cancel</button></div>
          </form>
        </section>
      )}

      <section className="candidate-layout">
        <div className="candidate-list-panel">
          <div className="candidate-search"><label><span className="sr-only">Search candidates</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" /></label><span>{candidates.length}</span></div>
          {candidates.length === 0 ? <div className="list-empty">No candidates found.</div> : (
            <div className="candidate-list">{candidates.map((candidate) => (
              <button className={selected?.id === candidate.id ? "active" : ""} type="button" key={candidate.id} onClick={() => setSelectedId(candidate.id)}>
                <span className="candidate-avatar">{initials(candidate.name)}</span>
                <span><strong>{candidate.name}</strong><small>{candidate.email}</small></span>
                <span className="application-total">{candidate.applications.length}</span>
              </button>
            ))}</div>
          )}
        </div>

        <div className="candidate-detail">
          {selected ? (
            <>
              <header><div><span className="candidate-avatar large">{initials(selected.name)}</span><div><h2>{selected.name}</h2><p>{selected.email}{selected.phone ? ` / ${selected.phone}` : ""}</p></div></div>{canManage && <button className="button secondary small" type="button" onClick={() => setEditor({ mode: "edit", candidate: selected })}>Edit profile</button>}</header>
              <div className="candidate-sections">
                <section>
                  <div className="detail-heading"><div><h3>Resumes</h3><span>{selected.resumes.length}</span></div></div>
                  {selected.resumes.length > 0 ? <ul className="resume-list">{selected.resumes.map((resume) => <li key={resume.id}><span aria-hidden="true">PDF</span><div><strong>{resume.originalName}</strong><small>{fileSize(resume.sizeBytes)} / {resume.parsedAt ? "Text extracted" : "Awaiting extraction"}</small></div>{canManage && !resume.parsedAt && <button className="text-button" type="button" disabled={Boolean(busy)} onClick={() => request(`${base}/candidates/${selected.id}/resumes/${resume.id}/parse`, { method: "POST" })}>Parse</button>}</li>)}</ul> : <p className="detail-empty">No resume has been uploaded.</p>}
                  {canManage && <form className="upload-form" onSubmit={uploadResume}><label><span>Attach PDF or DOCX</span><input name="resume" type="file" accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx" required /></label><button className="button secondary small" type="submit" disabled={Boolean(busy)}>Upload</button></form>}
                </section>
                <section>
                  <div className="detail-heading"><div><h3>Applications</h3><span>{selected.applications.length}</span></div></div>
                  {selected.applications.length > 0 ? <ul className="application-list">{selected.applications.map((application) => <li key={application.id}><div><strong>{application.job.title}</strong><small>Applied {new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(application.createdAt))}</small></div><span className="stage-chip">{application.currentStage.replaceAll("_", " ").toLowerCase()}</span></li>)}</ul> : <p className="detail-empty">No applications yet.</p>}
                  {canCreateApplication && <form className="application-form" onSubmit={createApplication}><label><span className="sr-only">Published job</span><select name="jobId" required defaultValue="" disabled={availableJobs.length === 0}><option value="" disabled>{availableJobs.length === 0 ? "No available published jobs" : "Select a published job"}</option>{availableJobs.map((job) => <option value={job.id} key={job.id}>{job.title}</option>)}</select></label><button className="button primary small" type="submit" disabled={Boolean(busy) || availableJobs.length === 0}>Create application</button></form>}
                </section>
              </div>
            </>
          ) : <div className="detail-placeholder"><span aria-hidden="true">C</span><h2>Select a candidate</h2><p>Choose a profile to review resumes and applications.</p></div>}
        </div>
      </section>
    </main>
  );
}
