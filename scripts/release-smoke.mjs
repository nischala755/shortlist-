import "dotenv/config";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { rm } from "node:fs/promises";
import pg from "pg";

const port = process.env.SMOKE_PORT ?? "3111";
const base = `http://127.0.0.1:${port}`;
const stamp = Date.now();
const adminEmail = `release-admin-${stamp}@example.test`;
const outsiderEmail = `release-outsider-${stamp}@example.test`;
const password = "ReleaseSmoke!2026";
const databaseUrl = process.env.DATABASE_URL?.replace(/\?schema=[^&]+(&|$)/, "$1");
if (!databaseUrl) throw new Error("DATABASE_URL is required for release smoke tests");
const pool = new pg.Pool({ connectionString: databaseUrl });
const server = process.platform === "win32"
  ? spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", `npm.cmd run dev -- -p ${port}`], { stdio: "ignore" })
  : spawn("npm", ["run", "dev", "--", "-p", port], { stdio: "ignore" });
const cookies = new Map();
function cookie(name) { return cookies.get(name) ?? ""; }
async function request(path, options = {}, account = "admin") { const headers = new Headers(options.headers); if (cookie(account)) headers.set("cookie", cookie(account)); const response = await fetch(`${base}${path}`, { ...options, headers }); const setCookie = response.headers.get("set-cookie"); if (setCookie) cookies.set(account, setCookie.split(";")[0]); const body = await response.json().catch(() => null); return { response, body }; }
async function json(path, body, method = "POST", account = "admin") { return request(path, { method, headers: { "content-type": "application/json", origin: base, host: `127.0.0.1:${port}` }, body: JSON.stringify(body) }, account); }
async function ready() { for (let attempt = 0; attempt < 60; attempt += 1) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 500)); } throw new Error("Smoke server did not become ready"); }
async function verify(email) { await pool.query('UPDATE "User" SET "emailVerifiedAt"=NOW() WHERE "email"=$1', [email]); }

let organizationId;
try {
  await ready();
  for (const [email, account] of [[adminEmail, "admin"], [outsiderEmail, "outsider"]]) { const registered = await json("/api/auth/register", { email, password }, "POST", account); if (registered.response.status !== 201) throw new Error(`Registration failed: ${registered.response.status}`); await verify(email); const login = await json("/api/auth/login", { email, password }, "POST", account); if (!login.response.ok) throw new Error(`Login failed: ${login.response.status}`); }
  const organization = await json("/api/organizations", { name: `Release smoke ${stamp}` }); organizationId = organization.body.organization.id;
  const foreign = await request(`/api/organizations/${organizationId}/jobs`, {}, "outsider"); if (foreign.response.status !== 404) throw new Error(`Organization isolation failed: ${foreign.response.status}`);
  const csrf = await fetch(`${base}/api/organizations`, { method: "POST", headers: { "content-type": "application/json", origin: "https://foreign.example", "sec-fetch-site": "cross-site" }, body: "{}" }); if (csrf.status !== 403) throw new Error(`Cross-site protection failed: ${csrf.status}`);
  const job = await json(`/api/organizations/${organizationId}/jobs`, { title: "Release Engineer", description: "Verify release workflows." });
  await json(`/api/organizations/${organizationId}/jobs/${job.body.job.id}/requirements`, { title: "Traceability", description: "Evidence of verified releases." });
  await json(`/api/organizations/${organizationId}/jobs/${job.body.job.id}/publish`, {});
  const candidate = await json(`/api/organizations/${organizationId}/candidates`, { name: "Release Candidate", email: `candidate-${stamp}@example.test` });
  const application = await json(`/api/organizations/${organizationId}/applications`, { jobId: job.body.job.id, candidateId: candidate.body.candidate.id });
  for (const stage of ["SCREENING", "SHORTLISTED", "INTERVIEW", "OFFER"]) { const changed = await json(`/api/organizations/${organizationId}/applications/${application.body.application.id}/stage`, { stage }, "PATCH"); if (!changed.response.ok) throw new Error(`Stage transition ${stage} failed`); }
  const analytics = await request(`/api/organizations/${organizationId}/analytics`); if (analytics.body.applications.total !== 1) throw new Error("Analytics smoke mismatch");
  const audit = await request(`/api/organizations/${organizationId}/audit-logs?action=APPLICATION_STAGE_CHANGED`); if (audit.body.auditLogs.length !== 4) throw new Error("Audit smoke mismatch");
  const digest = createHash("sha256").update(`${organizationId}:${application.body.application.id}`).digest("hex").slice(0, 12);
  console.log(JSON.stringify({ status: "passed", isolation: true, crossSiteProtection: true, applicationLifecycle: true, analytics: true, auditEvents: 4, run: digest }));
} finally {
  if (organizationId) await pool.query('DELETE FROM "Organization" WHERE "id"=$1', [organizationId]);
  await pool.query('DELETE FROM "User" WHERE "email" = ANY($1)', [[adminEmail, outsiderEmail]]);
  await pool.end(); server.kill();
  await rm(".smoke-runtime", { recursive: true, force: true }).catch(() => undefined);
}
