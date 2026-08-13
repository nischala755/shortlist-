"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { responseError } from "./auth-form";

type Requirement = { id: string; title: string; description: string };
type Evidence = { id: string; title: string; details: string; sourceType: string; sourceReference: string | null; jobRequirementId: string | null; createdAt: string; createdBy: { email: string } };
type Analysis = { summary: string; skills: string[]; experienceHighlights: string[]; education: string[]; missingInformation: string[]; evidenceQuotes: string[] };
type Assistance = {
  provider: string;
  model: string;
  disclaimer: string;
  assistance: {
    mappings: Array<Requirement & { status: "SUPPORTED" | "PARTIAL" | "NOT_FOUND"; rationale: string; evidenceQuotes: string[] }>;
    interviewQuestions: Array<{ requirementId: string; question: string; rationale: string }>;
  };
};
type Candidate = {
  id: string;
  name: string;
  email: string;
  applications: Array<{ id: string; job: { id: string; title: string; requirements: Requirement[] } }>;
  resumes: Array<{ id: string; originalName: string; parsedAt: string | null; analysis: { provider: string; model: string; createdAt: string; analysis: Analysis } | null }>;
  evidence: Evidence[];
};

export function requirementCoverage(requirements: Requirement[], evidence: Evidence[]) {
  return requirements.map((requirement) => ({
    ...requirement,
    evidence: evidence.filter((item) => item.jobRequirementId === requirement.id),
  }));
}

export function EvidenceWorkspace({ organizationId, organizationName, canManage, initialCandidates }: { organizationId: string; organizationName: string; canManage: boolean; initialCandidates: Candidate[] }) {
  const router = useRouter();
  const [candidateId, setCandidateId] = useState(initialCandidates[0]?.id ?? "");
  const candidate = initialCandidates.find((item) => item.id === candidateId) ?? initialCandidates[0];
  const [jobId, setJobId] = useState(candidate?.applications[0]?.job.id ?? "");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [assistance, setAssistance] = useState<Assistance | null>(null);
  const application = candidate?.applications.find((item) => item.job.id === jobId) ?? candidate?.applications[0];
  const requirements = application?.job.requirements ?? [];
  const coverage = requirementCoverage(requirements, candidate?.evidence ?? []);
  const covered = coverage.filter((requirement) => requirement.evidence.length > 0).length;
  const percent = coverage.length ? Math.round((covered / coverage.length) * 100) : 0;
  const latestResume = candidate?.resumes[0];

  function chooseCandidate(nextCandidateId: string) {
    const next = initialCandidates.find((item) => item.id === nextCandidateId);
    setCandidateId(nextCandidateId);
    setJobId(next?.applications[0]?.job.id ?? "");
    setAssistance(null);
  }

  async function generateAssistance() {
    if (!application) return;
    const path = `/api/organizations/${organizationId}/applications/${application.id}/ai-assistance`;
    setBusy(path);
    setError("");
    try {
      const response = await fetch(path, { method: "POST" });
      if (!response.ok) {
        setError(await responseError(response));
        return;
      }
      setAssistance((await response.json()) as Assistance);
    } catch {
      setError("The service is unavailable. Try again shortly.");
    } finally {
      setBusy("");
    }
  }

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
    } finally { setBusy(""); }
  }

  async function addEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!candidate) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const saved = await request(`/api/organizations/${organizationId}/candidates/${candidate.id}/evidence`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: form.get("title"), details: form.get("details"), sourceType: form.get("sourceType"), sourceReference: form.get("sourceReference"), jobRequirementId: form.get("jobRequirementId") }),
    });
    if (saved) formElement.reset();
  }

  return <main className="workspace-main evidence-main">
    <div className="workspace-title"><div><p className="eyebrow">{organizationName}</p><h1>Evidence review</h1><p>Verify source material against the requirements for the role. Missing evidence is not a rejection decision.</p></div></div>
    <div className="evidence-controls"><label>Candidate<select value={candidate?.id ?? ""} onChange={(event) => chooseCandidate(event.target.value)}><option value="" disabled>Select candidate</option>{initialCandidates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Applied job<select value={application?.job.id ?? ""} onChange={(event) => { setJobId(event.target.value); setAssistance(null); }} disabled={!candidate?.applications.length}><option value="" disabled>No application selected</option>{candidate?.applications.map((item) => <option key={item.job.id} value={item.job.id}>{item.job.title}</option>)}</select></label></div>
    {error && <p className="form-message error workspace-error" role="alert">{error}</p>}
    {!candidate ? <section className="empty-state compact"><h2>No candidates to review</h2><p>Add a candidate and application before mapping evidence.</p></section> : !application ? <section className="empty-state compact"><h2>No application to review</h2><p>Create an application for {candidate.name} before mapping evidence to job requirements.</p></section> : <>
      <section className="coverage-banner"><div><span>Requirement coverage</span><strong>{percent}%</strong></div><div className="coverage-meter"><i style={{ width: `${percent}%` }} /></div><p>{covered} covered / {coverage.length - covered} missing / {coverage.length} total</p><small>Coverage means at least one human-recorded evidence item is linked. It does not measure candidate quality.</small></section>
      <section className="ai-assistance-panel"><header><div><p className="eyebrow">Grounded review aid</p><h2>Requirement follow-ups</h2><p>Compare exact resume excerpts with this job and prepare questions. Suggestions never become candidate evidence automatically.</p></div>{latestResume?.parsedAt && requirements.length > 0 && <button className="button secondary small" type="button" disabled={Boolean(busy)} onClick={generateAssistance}>{assistance ? "Generate again" : "Suggest follow-ups"}</button>}</header>{assistance ? <><p className="ai-disclaimer"><strong>Human review required.</strong> {assistance.disclaimer}</p><div className="assistance-mappings">{assistance.assistance.mappings.map((mapping) => <article key={mapping.id}><div><span className={`mapping-status ${mapping.status.toLowerCase()}`}>{mapping.status.replaceAll("_", " ").toLowerCase()}</span><h3>{mapping.title}</h3></div><p>{mapping.rationale}</p>{mapping.evidenceQuotes.length > 0 && <ul>{mapping.evidenceQuotes.map((quote) => <li key={quote}>{quote}</li>)}</ul>}</article>)}</div><div className="suggested-questions"><h3>Suggested interview questions</h3>{assistance.assistance.interviewQuestions.length > 0 ? <ol>{assistance.assistance.interviewQuestions.map((item, index) => <li key={`${item.requirementId}-${index}`}><strong>{item.question}</strong><span>{requirements.find((requirement) => requirement.id === item.requirementId)?.title} / {item.rationale}</span></li>)}</ol> : <p className="muted">No additional follow-up questions were suggested.</p>}</div><small>{assistance.provider} / {assistance.model}</small></> : <p className="panel-empty">Generate a temporary, source-grounded mapping after the resume is parsed and job requirements are defined.</p>}</section>
      <div className="evidence-grid"><section className="analysis-panel"><header><div><p className="eyebrow">AI-assisted extraction</p><h2>Resume analysis</h2></div>{canManage && latestResume?.parsedAt && <button className="button secondary small" type="button" disabled={Boolean(busy)} onClick={() => request(`/api/organizations/${organizationId}/candidates/${candidate.id}/resumes/${latestResume.id}/analysis`, { method: "POST" })}>{latestResume.analysis ? "Run again" : "Analyze resume"}</button>}</header>{!latestResume ? <p className="panel-empty">No resume uploaded.</p> : !latestResume.parsedAt ? <p className="panel-empty">Parse {latestResume.originalName} before requesting analysis.</p> : !latestResume.analysis ? <p className="panel-empty">No analysis yet. Analysis requires a configured Mistral API key.</p> : <div className="analysis-content"><div className="ai-boundary"><strong>Review aid only</strong><span>Generated fields are unverified until a reviewer records source-backed evidence below.</span></div><h3>Summary</h3><p>{latestResume.analysis.analysis.summary}</p><h3>Skills mentioned</h3><div className="skill-list">{latestResume.analysis.analysis.skills.map((skill) => <span key={skill}>{skill}</span>)}</div><h3>Exact resume excerpts</h3>{latestResume.analysis.analysis.evidenceQuotes.length ? <ul className="quote-list">{latestResume.analysis.analysis.evidenceQuotes.map((quote) => <li key={quote}>{quote}</li>)}</ul> : <p className="muted">No exact excerpts returned.</p>}<h3>Missing information</h3>{latestResume.analysis.analysis.missingInformation.length ? <ul className="missing-list">{latestResume.analysis.analysis.missingInformation.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted">No missing information was flagged.</p>}<small>{latestResume.analysis.provider} / {latestResume.analysis.model}</small></div>}</section>
        <section className="matrix-panel"><header><p className="eyebrow">Human-reviewed record</p><h2>{application.job.title}</h2></header><div className="matrix-list">{coverage.map((requirement) => <article key={requirement.id} className={requirement.evidence.length ? "covered" : "missing"}><header><div><span>{requirement.evidence.length ? "Covered" : "Evidence gap"}</span><h3>{requirement.title}</h3></div><strong>{requirement.evidence.length}</strong></header><p>{requirement.description}</p>{requirement.evidence.map((item) => <div className="evidence-item" key={item.id}><div><strong>{item.title}</strong><span>{item.sourceType.toLowerCase()} / {item.createdBy.email}</span></div><p>{item.details}</p>{canManage && <button type="button" disabled={Boolean(busy)} onClick={() => request(`/api/organizations/${organizationId}/candidates/${candidate.id}/evidence/${item.id}`, { method: "DELETE" })}>Remove</button>}</div>)}</article>)}</div>{coverage.length === 0 && <p className="panel-empty">This job has no evidence requirements.</p>}</section>
      </div>
      {canManage && <section className="evidence-editor"><div><p className="eyebrow">Reviewer action</p><h2>Record evidence</h2><p>Only record claims you can trace to the selected source. AI suggestions are not saved automatically.</p></div><form onSubmit={addEvidence}><div className="field-pair"><label>Evidence title<input name="title" required maxLength={200} placeholder="Operated a production API" /></label><label>Map to requirement<select name="jobRequirementId" defaultValue=""><option value="">Unlinked evidence</option>{requirements.map((requirement) => <option key={requirement.id} value={requirement.id}>{requirement.title}</option>)}</select></label></div><label>Observed evidence<textarea name="details" required maxLength={10000} placeholder="Record the relevant fact or exact excerpt and why it supports the requirement." /></label><div className="field-pair"><label>Source<select name="sourceType" required defaultValue="RESUME"><option value="RESUME">Resume</option><option value="INTERVIEW">Interview</option><option value="ASSESSMENT">Assessment</option><option value="MANUAL">Manual review</option></select></label><label>Source reference <span className="optional">Optional</span><input name="sourceReference" maxLength={500} placeholder="Resume page, interview, or assessment" /></label></div><button className="button primary" type="submit" disabled={Boolean(busy)}>Save reviewed evidence</button></form></section>}
    </>}
  </main>;
}
