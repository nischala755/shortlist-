"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { responseError } from "./auth-form";

type Criterion = { name: string; rating: number; notes?: string };
type Scorecard = { id: string; criteria: Criterion[]; overallRating: number; strengths: string | null; concerns: string | null; notes: string | null; submittedBy: { email: string } };
type Interview = { id: string; scheduledStart: string; scheduledEnd: string; location: string | null; meetingUrl: string | null; status: "SCHEDULED" | "COMPLETED" | "CANCELLED"; interviewer: { id: string; email: string }; scorecard: Scorecard | null };
type Application = { id: string; currentStage: string; candidate: { name: string; email: string }; job: { title: string }; interviews: Interview[] };
type Member = { user: { id: string; email: string }; role: string };

export function upcomingInterviews(applications: Application[]) {
  return applications.flatMap((application) => application.interviews.map((interview) => ({ ...interview, application }))).filter((item) => item.status === "SCHEDULED").sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
}

function localDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function defaultTimes() {
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  return { start: localDateTime(start.toISOString()), end: localDateTime(new Date(start.getTime() + 60 * 60 * 1000).toISOString()) };
}

export function InterviewWorkspace({ organizationId, organizationName, canSchedule, canScore, applications, members }: { organizationId: string; organizationName: string; canSchedule: boolean; canScore: boolean; applications: Application[]; members: Member[] }) {
  const router = useRouter();
  const [applicationId, setApplicationId] = useState(applications[0]?.id ?? "");
  const [editor, setEditor] = useState<{ application: Application; interview?: Interview } | null>(null);
  const [scoreEditor, setScoreEditor] = useState<{ application: Application; interview: Interview } | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const selected = applications.find((application) => application.id === applicationId) ?? applications[0];
  const upcoming = upcomingInterviews(applications);
  const times = defaultTimes();

  async function request(path: string, options: RequestInit) {
    setBusy(path); setError("");
    try {
      const response = await fetch(path, options);
      if (!response.ok) { setError(await responseError(response)); return false; }
      router.refresh(); return true;
    } catch { setError("The service is unavailable. Try again shortly."); return false; }
    finally { setBusy(""); }
  }

  async function saveInterview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editor) return;
    const form = new FormData(event.currentTarget);
    const body = { interviewerId: form.get("interviewerId"), scheduledStart: new Date(String(form.get("scheduledStart"))).toISOString(), scheduledEnd: new Date(String(form.get("scheduledEnd"))).toISOString(), meetingUrl: form.get("meetingUrl"), location: form.get("location"), status: form.get("status") ?? "SCHEDULED" };
    const base = `/api/organizations/${organizationId}/applications/${editor.application.id}/interviews`;
    const saved = await request(editor.interview ? `${base}/${editor.interview.id}` : base, { method: editor.interview ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (saved) setEditor(null);
  }

  async function saveScorecard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!scoreEditor) return;
    const form = new FormData(event.currentTarget);
    const criteria = ["Role knowledge", "Evidence quality", "Communication"].map((name, index) => ({ name, rating: Number(form.get(`rating-${index}`)), notes: String(form.get(`notes-${index}`) ?? "") }));
    const existing = scoreEditor.interview.scorecard;
    const saved = await request(`/api/organizations/${organizationId}/applications/${scoreEditor.application.id}/interviews/${scoreEditor.interview.id}/scorecard`, { method: existing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ criteria, overallRating: Number(form.get("overallRating")), strengths: form.get("strengths"), concerns: form.get("concerns"), notes: form.get("notes") }) });
    if (saved) setScoreEditor(null);
  }

  return <main className="workspace-main interview-main"><div className="workspace-title"><div><p className="eyebrow">{organizationName}</p><h1>Interviews</h1><p>Schedule structured conversations, capture consistent feedback, and keep the decision with the hiring team.</p></div>{canSchedule && selected && <button className="button primary" type="button" onClick={() => setEditor({ application: selected })}>Schedule interview</button>}</div>
    <section className="interview-summary"><article><span>Upcoming</span><strong>{upcoming.length}</strong></article><article><span>Completed</span><strong>{applications.flatMap((item) => item.interviews).filter((item) => item.status === "COMPLETED").length}</strong></article><article><span>Scorecards</span><strong>{applications.flatMap((item) => item.interviews).filter((item) => item.scorecard).length}</strong></article></section>
    {error && <p className="form-message error workspace-error" role="alert">{error}</p>}
    <div className="interview-layout"><aside><label>Application<select value={selected?.id ?? ""} onChange={(event) => setApplicationId(event.target.value)}><option value="" disabled>Select application</option>{applications.map((application) => <option key={application.id} value={application.id}>{application.candidate.name} / {application.job.title}</option>)}</select></label><h2>Upcoming schedule</h2>{upcoming.length ? <ul>{upcoming.map((item) => <li key={item.id}><strong>{new Intl.DateTimeFormat("en", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(item.scheduledStart))}</strong><span>{item.application.candidate.name}</span><small>{item.interviewer.email}</small></li>)}</ul> : <p>No upcoming interviews.</p>}</aside><section className="interview-detail">{selected ? <><header><div><span>{selected.currentStage.toLowerCase()}</span><h2>{selected.candidate.name}</h2><p>{selected.job.title} / {selected.candidate.email}</p></div></header>{selected.interviews.length ? <div className="interview-list">{selected.interviews.map((interview) => <article key={interview.id}><header><div><span className={`interview-status ${interview.status.toLowerCase()}`}>{interview.status.toLowerCase()}</span><h3>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(interview.scheduledStart))}</h3><p>{interview.interviewer.email}</p></div><strong>{Math.round((new Date(interview.scheduledEnd).getTime() - new Date(interview.scheduledStart).getTime()) / 60000)} min</strong></header><div className="interview-access">{interview.meetingUrl ? <a href={interview.meetingUrl} target="_blank" rel="noreferrer">Open meeting link</a> : <span>{interview.location}</span>}</div>{interview.scorecard ? <div className="scorecard-review"><div><span>Overall rating</span><strong>{interview.scorecard.overallRating}/5</strong></div><p><b>Strengths</b>{interview.scorecard.strengths || "Not recorded"}</p><p><b>Concerns</b>{interview.scorecard.concerns || "Not recorded"}</p><small>Submitted by {interview.scorecard.submittedBy.email}</small></div> : <p className="scorecard-empty">No structured scorecard submitted.</p>}<footer>{canSchedule && interview.status !== "CANCELLED" && <button type="button" onClick={() => setEditor({ application: selected, interview })}>{interview.status === "SCHEDULED" ? "Reschedule" : "Edit details"}</button>}{canSchedule && interview.status === "SCHEDULED" && <button className="danger" type="button" disabled={Boolean(busy)} onClick={() => request(`/api/organizations/${organizationId}/applications/${selected.id}/interviews/${interview.id}`, { method: "DELETE" })}>Cancel interview</button>}{canScore && interview.status === "COMPLETED" && <button className="primary-action" type="button" onClick={() => setScoreEditor({ application: selected, interview })}>{interview.scorecard ? "Edit scorecard" : "Add scorecard"}</button>}</footer></article>)}</div> : <div className="panel-empty">No interviews scheduled for this application.</div>}</> : <div className="panel-empty">No applications are available.</div>}</section></div>
    {editor && <div className="modal-backdrop"><section className="interview-modal" role="dialog" aria-modal="true" aria-label={editor.interview ? "Edit interview" : "Schedule interview"}><header><div><p className="eyebrow">{editor.application.candidate.name}</p><h2>{editor.interview ? "Update interview" : "Schedule interview"}</h2></div><button type="button" onClick={() => setEditor(null)}>Close</button></header><form onSubmit={saveInterview}><label>Interviewer<select name="interviewerId" required defaultValue={editor.interview?.interviewer.id ?? ""}><option value="" disabled>Select organization member</option>{members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.email} / {member.role.toLowerCase().replaceAll("_", " ")}</option>)}</select></label><div className="field-pair"><label>Starts<input name="scheduledStart" type="datetime-local" required defaultValue={editor.interview ? localDateTime(editor.interview.scheduledStart) : times.start} /></label><label>Ends<input name="scheduledEnd" type="datetime-local" required defaultValue={editor.interview ? localDateTime(editor.interview.scheduledEnd) : times.end} /></label></div><div className="field-pair"><label>Meeting URL <span className="optional">Optional with location</span><input name="meetingUrl" type="url" maxLength={2000} defaultValue={editor.interview?.meetingUrl ?? ""} /></label><label>Location <span className="optional">Optional with URL</span><input name="location" maxLength={500} defaultValue={editor.interview?.location ?? ""} /></label></div>{editor.interview && <label>Status<select name="status" defaultValue={editor.interview.status}><option value="SCHEDULED">Scheduled</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select></label>}<button className="button primary" type="submit" disabled={Boolean(busy)}>Save interview</button></form></section></div>}
    {scoreEditor && <div className="modal-backdrop"><section className="interview-modal scorecard-modal" role="dialog" aria-modal="true" aria-label="Structured interview scorecard"><header><div><p className="eyebrow">Structured feedback</p><h2>{scoreEditor.interview.scorecard ? "Edit scorecard" : "Submit scorecard"}</h2></div><button type="button" onClick={() => setScoreEditor(null)}>Close</button></header><form onSubmit={saveScorecard}>{["Role knowledge", "Evidence quality", "Communication"].map((name, index) => { const existing = scoreEditor.interview.scorecard?.criteria[index]; return <div className="criterion-row" key={name}><label>{name}<select name={`rating-${index}`} required defaultValue={existing?.rating ?? 3}>{[1,2,3,4,5].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}</select></label><label>Notes <span className="optional">Optional</span><input name={`notes-${index}`} maxLength={2000} defaultValue={existing?.notes ?? ""} /></label></div>; })}<label>Overall rating<select name="overallRating" required defaultValue={scoreEditor.interview.scorecard?.overallRating ?? 3}>{[1,2,3,4,5].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}</select></label><label>Strengths<textarea name="strengths" maxLength={5000} defaultValue={scoreEditor.interview.scorecard?.strengths ?? ""} /></label><label>Concerns<textarea name="concerns" maxLength={5000} defaultValue={scoreEditor.interview.scorecard?.concerns ?? ""} /></label><label>Additional notes<textarea name="notes" maxLength={5000} defaultValue={scoreEditor.interview.scorecard?.notes ?? ""} /></label><p className="human-decision-note">Record observed evidence. Do not infer protected traits or treat this scorecard as an automatic hiring decision.</p><button className="button primary" type="submit" disabled={Boolean(busy)}>Save scorecard</button></form></section></div>}
  </main>;
}
