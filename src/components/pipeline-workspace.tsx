"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  applicationStages,
  nextApplicationStages,
  type ApplicationStageValue,
} from "@/features/applications/application";
import { responseError } from "./auth-form";

type StageChange = {
  id: string;
  fromStage: ApplicationStageValue | null;
  toStage: ApplicationStageValue;
  changedAt: string;
  changedBy: { email: string };
};

type PipelineApplication = {
  id: string;
  currentStage: ApplicationStageValue;
  createdAt: string;
  updatedAt: string;
  candidate: { id: string; name: string; email: string };
  job: { id: string; title: string };
  stageHistory: StageChange[];
};

export function applicationsForJob(applications: PipelineApplication[], jobId: string) {
  return jobId === "ALL" ? applications : applications.filter((application) => application.job.id === jobId);
}

function label(stage: ApplicationStageValue) {
  return stage.charAt(0) + stage.slice(1).toLowerCase();
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function PipelineWorkspace({
  organizationId,
  organizationName,
  canManage,
  jobs,
  initialApplications,
}: {
  organizationId: string;
  organizationName: string;
  canManage: boolean;
  jobs: Array<{ id: string; title: string }>;
  initialApplications: PipelineApplication[];
}) {
  const router = useRouter();
  const [jobId, setJobId] = useState("ALL");
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const applications = useMemo(() => applicationsForJob(initialApplications, jobId), [initialApplications, jobId]);
  const selected = initialApplications.find((application) => application.id === selectedId);

  async function advance(application: PipelineApplication, stage: ApplicationStageValue) {
    setBusy(application.id);
    setError("");
    try {
      const response = await fetch(`/api/organizations/${organizationId}/applications/${application.id}/stage`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (!response.ok) {
        setError(await responseError(response));
        return;
      }
      router.refresh();
    } catch {
      setError("The service is unavailable. Try again shortly.");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="workspace-main pipeline-main">
      <div className="workspace-title">
        <div><p className="eyebrow">{organizationName}</p><h1>Pipeline</h1><p>Move applications through explicit review stages while preserving who changed what.</p></div>
        <label className="pipeline-filter"><span>Job</span><select value={jobId} onChange={(event) => setJobId(event.target.value)}><option value="ALL">All jobs</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></label>
      </div>
      <div className="pipeline-summary"><strong>{applications.length}</strong><span>application{applications.length === 1 ? "" : "s"} in this view</span><small>{canManage ? "Stage changes require an explicit action." : "Read-only pipeline access."}</small></div>
      {error && <p className="form-message error workspace-error" role="alert">{error}</p>}

      <section className="pipeline-board" aria-label="Application pipeline">
        {applicationStages.map((stage) => {
          const stageApplications = applications.filter((application) => application.currentStage === stage);
          return <div className="pipeline-column" key={stage}><header><span>{label(stage)}</span><strong>{stageApplications.length}</strong></header><div className="pipeline-cards">{stageApplications.map((application) => <article className="pipeline-card" key={application.id}><button className="pipeline-card-open" type="button" onClick={() => setSelectedId(application.id)}><span className="candidate-avatar">{initials(application.candidate.name)}</span><span><strong>{application.candidate.name}</strong><small>{application.job.title}</small></span></button><p>{application.candidate.email}</p>{canManage && nextApplicationStages(stage).length > 0 && <div className="pipeline-actions">{nextApplicationStages(stage).map((nextStage) => <button type="button" key={nextStage} disabled={busy === application.id} onClick={() => advance(application, nextStage)}>Move to {label(nextStage)}</button>)}</div>}</article>)}</div>{stageApplications.length === 0 && <p className="pipeline-empty">No applications</p>}</div>;
        })}
      </section>

      {selected && <div className="pipeline-drawer-backdrop" role="presentation" onMouseDown={() => setSelectedId("")}><aside className="pipeline-drawer" aria-label={`${selected.candidate.name} application history`} onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow">Application history</p><h2>{selected.candidate.name}</h2><span>{selected.job.title}</span></div><button type="button" aria-label="Close application history" onClick={() => setSelectedId("")}>Close</button></header><div className="drawer-status"><span>Current stage</span><strong>{label(selected.currentStage)}</strong></div><ol className="stage-timeline">{selected.stageHistory.map((change) => <li key={change.id}><i aria-hidden="true" /><div><strong>{change.fromStage ? `${label(change.fromStage)} to ${label(change.toStage)}` : `Entered ${label(change.toStage)}`}</strong><span>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(change.changedAt))}</span><small>Changed by {change.changedBy.email}</small></div></li>)}</ol><p className="human-decision-note">Pipeline movement records workflow progress. Hiring decisions remain with the authorized hiring team.</p></aside></div>}
    </main>
  );
}
