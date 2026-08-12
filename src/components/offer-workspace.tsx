"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { responseError } from "./auth-form";

type Offer = {
  id: string;
  title: string;
  details: string;
  compensationDetails: string | null;
  expiresAt: string | null;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED" | "WITHDRAWN";
  sentAt: string | null;
  respondedAt: string | null;
  responseNote: string | null;
  updatedAt: string;
  createdBy: { email: string };
};

export type OfferApplication = {
  id: string;
  currentStage: string;
  candidate: { name: string; email: string };
  job: { title: string };
  offer: Offer | null;
};

const statuses: Offer["status"][] = ["DRAFT", "SENT", "ACCEPTED", "DECLINED", "WITHDRAWN"];

export function countOffers(applications: OfferApplication[]) {
  return Object.fromEntries(statuses.map((status) => [status, applications.filter((application) => application.offer?.status === status).length])) as Record<Offer["status"], number>;
}

function dateTimeValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function OfferWorkspace({ organizationId, organizationName, canManage, applications }: { organizationId: string; organizationName: string; canManage: boolean; applications: OfferApplication[] }) {
  const router = useRouter();
  const [applicationId, setApplicationId] = useState(applications[0]?.id ?? "");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const selected = applications.find((application) => application.id === applicationId) ?? applications[0];
  const counts = useMemo(() => countOffers(applications), [applications]);

  async function request(options: RequestInit) {
    if (!selected) return false;
    setBusy(selected.id); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/organizations/${organizationId}/applications/${selected.id}/offer`, options);
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

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const saved = await request({
      method: selected?.offer ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: form.get("title"), details: form.get("details"), compensationDetails: form.get("compensationDetails"), expiresAt: form.get("expiresAt") }),
    });
    if (saved) setMessage(selected?.offer ? "Draft offer updated." : "Draft offer created.");
  }

  async function transition(status: "SENT" | "WITHDRAWN") {
    const updated = await request({ method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    if (updated) setMessage(status === "SENT" ? "Offer sent to the candidate portal." : "Offer withdrawn.");
  }

  return <main className="workspace-main offer-main">
    <div className="workspace-title"><div><p className="eyebrow">{organizationName}</p><h1>Offers</h1><p>Prepare terms, send them to the candidate portal, and retain the candidate&apos;s response.</p></div></div>
    {error && <p className="form-message error workspace-error" role="alert">{error}</p>}
    {message && <p className="form-message success workspace-error" role="status">{message}</p>}
    <section className="offer-summary" aria-label="Offer summary"><article><span>Drafts</span><strong>{counts.DRAFT}</strong></article><article><span>Awaiting response</span><strong>{counts.SENT}</strong></article><article><span>Accepted</span><strong>{counts.ACCEPTED}</strong></article><article><span>Declined</span><strong>{counts.DECLINED}</strong></article></section>
    <div className="offer-layout">
      <aside><label>Application<select value={selected?.id ?? ""} onChange={(event) => setApplicationId(event.target.value)} disabled={!applications.length}><option value="" disabled>Select application</option>{applications.map((application) => <option key={application.id} value={application.id}>{application.candidate.name} / {application.job.title}</option>)}</select></label><p>Applications appear here once they reach offer review. A candidate cannot see a draft.</p><div className="offer-queue">{applications.map((application) => <button className={application.id === selected?.id ? "active" : ""} type="button" key={application.id} onClick={() => setApplicationId(application.id)}><span>{application.candidate.name}</span><small>{application.offer?.status.toLowerCase() ?? "not drafted"}</small></button>)}</div></aside>
      <section className="offer-detail">{selected ? <><header><div><span>{selected.currentStage.toLowerCase()}</span><h2>{selected.candidate.name}</h2><p>{selected.job.title} / {selected.candidate.email}</p></div>{selected.offer && <strong className={`offer-status ${selected.offer.status.toLowerCase()}`}>{selected.offer.status.toLowerCase()}</strong>}</header>
        {!selected.offer && canManage && selected.currentStage === "OFFER" && <OfferForm key={selected.id} onSubmit={save} busy={Boolean(busy)} />}
        {!selected.offer && !canManage && <div className="panel-empty">No offer has been drafted for this application.</div>}
        {selected.offer?.status === "DRAFT" && canManage && <OfferForm key={selected.offer.updatedAt} offer={selected.offer} onSubmit={save} busy={Boolean(busy)} />}
        {selected.offer?.status === "DRAFT" && !canManage && <OfferReadOnly offer={selected.offer} />}
        {selected.offer && selected.offer.status !== "DRAFT" && <OfferReadOnly offer={selected.offer} />}
        {selected.offer && <footer className="offer-actions"><span>{selected.offer.status === "DRAFT" ? "Review every term before sending. Sending makes this visible to the candidate." : selected.offer.sentAt ? `Sent ${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(selected.offer.sentAt))}` : "Not sent"}</span>{canManage && selected.offer.status === "DRAFT" && <button className="button primary" type="button" disabled={Boolean(busy)} onClick={() => transition("SENT")}>Send offer</button>}{canManage && selected.offer.status === "SENT" && <button className="button danger-button" type="button" disabled={Boolean(busy)} onClick={() => transition("WITHDRAWN")}>Withdraw offer</button>}</footer>}
      </> : <div className="panel-empty">No applications are ready for offer review.</div>}</section>
    </div>
    <p className="human-decision-note offer-decision-note">Offer acceptance records the candidate&apos;s response. Moving an application to hired remains a separate action for the hiring team.</p>
  </main>;
}

function OfferForm({ offer, onSubmit, busy }: { offer?: Offer; onSubmit: (event: FormEvent<HTMLFormElement>) => void; busy: boolean }) {
  return <form className="offer-editor" onSubmit={onSubmit}><label>Offer title<input name="title" required maxLength={200} defaultValue={offer?.title ?? "Offer of employment"} /></label><label>Offer details<textarea name="details" required maxLength={20000} defaultValue={offer?.details ?? ""} placeholder="Role, start date, working arrangement, conditions, and next steps" /></label><div className="field-pair"><label>Compensation details <span className="optional">Optional</span><input name="compensationDetails" maxLength={500} defaultValue={offer?.compensationDetails ?? ""} /></label><label>Response deadline <span className="optional">Optional</span><input name="expiresAt" type="datetime-local" defaultValue={dateTimeValue(offer?.expiresAt ?? null)} /></label></div><button className="button secondary" type="submit" disabled={busy}>{offer ? "Save draft" : "Create draft"}</button></form>;
}

function OfferReadOnly({ offer }: { offer: Offer }) {
  return <div className="offer-review"><h3>{offer.title}</h3><p>{offer.details}</p>{offer.compensationDetails && <section><span>Compensation</span><p>{offer.compensationDetails}</p></section>}<dl><div><dt>Created by</dt><dd>{offer.createdBy.email}</dd></div><div><dt>Response deadline</dt><dd>{offer.expiresAt ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(offer.expiresAt)) : "No deadline"}</dd></div></dl>{offer.respondedAt && <section className="offer-response"><span>Candidate response</span><strong>{offer.status.toLowerCase()}</strong><p>{offer.responseNote || "No response note supplied."}</p><small>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(offer.respondedAt))}</small></section>}</div>;
}
