import "dotenv/config";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { rm } from "node:fs/promises";
import pg from "pg";

const port = process.env.SMOKE_PORT ?? "3111";
const base = `http://127.0.0.1:${port}`;
const stamp = Date.now();
const password = "ReleaseSmoke!2026";
const accounts = {
  admin: `release-admin-${stamp}@example.test`,
  candidate: `release-candidate-${stamp}@example.test`,
  outsider: `release-outsider-${stamp}@example.test`,
};
const databaseUrl = process.env.DATABASE_URL?.replace(/\?schema=[^&]+(&|$)/, "$1");
if (!databaseUrl) throw new Error("DATABASE_URL is required for release smoke tests");

const pool = new pg.Pool({ connectionString: databaseUrl });
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", port],
  { stdio: "ignore" },
);
const cookies = new Map();

async function request(path, options = {}, account = "admin") {
  const headers = new Headers(options.headers);
  const cookie = cookies.get(account);
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(`${base}${path}`, { ...options, headers });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookies.set(account, setCookie.split(";")[0]);
  const body = await response.json().catch(() => null);
  return { response, body };
}

function json(path, body, method = "POST", account = "admin") {
  return request(
    path,
    {
      method,
      headers: {
        "content-type": "application/json",
        origin: base,
        host: `127.0.0.1:${port}`,
      },
      body: JSON.stringify(body),
    },
    account,
  );
}

async function expectStatus(resultPromise, expected, label) {
  const result = await resultPromise;
  if (result.response.status !== expected) {
    throw new Error(
      `${label} failed: expected ${expected}, received ${result.response.status} (${JSON.stringify(result.body)})`,
    );
  }
  return result.body;
}

async function ready() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(`${base}/api/health/database`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Smoke server did not become ready");
}

async function registerAndLogin(email, account) {
  await expectStatus(
    json("/api/auth/register", { email, password }, "POST", account),
    201,
    `${account} registration`,
  );
  await pool.query('UPDATE "User" SET "emailVerifiedAt"=NOW() WHERE "email"=$1', [email]);
  await expectStatus(
    json("/api/auth/login", { email, password }, "POST", account),
    200,
    `${account} login`,
  );
}

let organizationId;
try {
  await ready();
  for (const [account, email] of Object.entries(accounts)) {
    await registerAndLogin(email, account);
  }

  const admin = await expectStatus(
    request("/api/auth/me"),
    200,
    "admin session lookup",
  );
  const organization = await expectStatus(
    json("/api/organizations", { name: `Release smoke ${stamp}` }),
    201,
    "organization creation",
  );
  organizationId = organization.organization.id;

  await expectStatus(
    request(`/api/organizations/${organizationId}/jobs`, {}, "outsider"),
    404,
    "outsider organization isolation",
  );
  const csrf = await fetch(`${base}/api/organizations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://foreign.example",
      "sec-fetch-site": "cross-site",
    },
    body: "{}",
  });
  if (csrf.status !== 403) throw new Error(`Cross-site protection failed: ${csrf.status}`);

  await expectStatus(
    json(`/api/organizations/${organizationId}/members`, {
      email: accounts.candidate,
      role: "CANDIDATE",
    }),
    201,
    "candidate membership creation",
  );
  await expectStatus(
    request(`/api/organizations/${organizationId}/jobs`, {}, "candidate"),
    403,
    "candidate recruiting-workspace denial",
  );

  const job = await expectStatus(
    json(`/api/organizations/${organizationId}/jobs`, {
      title: "Release Engineer",
      description: "Verify release workflows.",
    }),
    201,
    "job creation",
  );
  const requirement = await expectStatus(
    json(`/api/organizations/${organizationId}/jobs/${job.job.id}/requirements`, {
      title: "Traceability",
      description: "Evidence of verified releases.",
    }),
    201,
    "job requirement creation",
  );
  await expectStatus(
    json(`/api/organizations/${organizationId}/jobs/${job.job.id}/publish`, {}),
    200,
    "job publication",
  );

  const candidate = await expectStatus(
    json(`/api/organizations/${organizationId}/candidates`, {
      name: "Release Candidate",
      email: accounts.candidate,
    }),
    201,
    "candidate creation",
  );
  const application = await expectStatus(
    json(`/api/organizations/${organizationId}/applications`, {
      jobId: job.job.id,
      candidateId: candidate.candidate.id,
    }),
    201,
    "application creation",
  );
  const applicationId = application.application.id;

  await expectStatus(
    json(`/api/organizations/${organizationId}/candidates/${candidate.candidate.id}/evidence`, {
      title: "Verified release ownership",
      details: "Maintained traceable release checks.",
      sourceType: "MANUAL",
      sourceReference: "Release smoke review",
      jobRequirementId: requirement.requirement.id,
    }),
    201,
    "candidate evidence creation",
  );
  const matrix = await expectStatus(
    request(`/api/organizations/${organizationId}/jobs/${job.job.id}/candidates/${candidate.candidate.id}/evidence-matrix`),
    200,
    "evidence matrix lookup",
  );
  if (matrix.matrix.requirements[0]?.evidence.length !== 1) {
    throw new Error("Evidence matrix did not include reviewed evidence");
  }

  for (const stage of ["SCREENING", "SHORTLISTED", "ASSESSMENT"]) {
    await expectStatus(
      json(`/api/organizations/${organizationId}/applications/${applicationId}/stage`, { stage }, "PATCH"),
      200,
      `application transition to ${stage}`,
    );
  }

  const assessment = await expectStatus(
    json(`/api/organizations/${organizationId}/applications/${applicationId}/assessments`, {
      title: "Release reasoning",
      instructions: "Explain one safe release check.",
      durationMinutes: 30,
    }),
    201,
    "assessment creation",
  );
  const assessmentId = assessment.assessment.id;
  const question = await expectStatus(
    json(`/api/organizations/${organizationId}/applications/${applicationId}/assessments/${assessmentId}/questions`, {
      prompt: "How would you verify a database migration?",
      language: "Text",
      points: 5,
    }),
    201,
    "assessment question creation",
  );
  await expectStatus(
    json(`/api/organizations/${organizationId}/applications/${applicationId}/assessments/${assessmentId}`, { status: "ASSIGNED" }, "PATCH"),
    200,
    "assessment assignment",
  );
  await expectStatus(
    json(`/api/portal/organizations/${organizationId}/applications/${applicationId}/assessments/${assessmentId}`, { status: "DRAFT", answers: {} }, "POST", "candidate"),
    201,
    "candidate assessment start",
  );
  await expectStatus(
    json(`/api/portal/organizations/${organizationId}/applications/${applicationId}/assessments/${assessmentId}`, {
      status: "SUBMITTED",
      answers: { [question.question.id]: "Apply the migration in isolation and verify schema status." },
    }, "POST", "candidate"),
    200,
    "candidate assessment submission",
  );
  await expectStatus(
    json(`/api/organizations/${organizationId}/applications/${applicationId}/assessments/${assessmentId}`, { status: "CLOSED" }, "PATCH"),
    200,
    "assessment closure",
  );

  await expectStatus(
    json(`/api/organizations/${organizationId}/applications/${applicationId}/stage`, { stage: "INTERVIEW" }, "PATCH"),
    200,
    "application transition to INTERVIEW",
  );
  const futureStart = new Date(Date.now() + 60 * 60_000);
  const futureEnd = new Date(futureStart.getTime() + 60 * 60_000);
  const interview = await expectStatus(
    json(`/api/organizations/${organizationId}/applications/${applicationId}/interviews`, {
      interviewerId: admin.user.id,
      scheduledStart: futureStart.toISOString(),
      scheduledEnd: futureEnd.toISOString(),
      location: "Release room",
    }),
    201,
    "interview scheduling",
  );
  const interviewId = interview.interview.id;
  const completedStart = new Date(Date.now() - 2 * 60 * 60_000);
  const completedEnd = new Date(Date.now() - 60 * 60_000);
  await pool.query(
    'UPDATE "Interview" SET "scheduledStart"=$1, "scheduledEnd"=$2 WHERE "id"=$3',
    [completedStart, completedEnd, interviewId],
  );
  await expectStatus(
    json(`/api/organizations/${organizationId}/applications/${applicationId}/interviews/${interviewId}`, {
      interviewerId: admin.user.id,
      scheduledStart: completedStart.toISOString(),
      scheduledEnd: completedEnd.toISOString(),
      location: "Release room",
      status: "COMPLETED",
    }, "PATCH"),
    200,
    "interview completion",
  );
  await expectStatus(
    json(`/api/organizations/${organizationId}/applications/${applicationId}/interviews/${interviewId}/scorecard`, {
      criteria: [{ name: "Release reasoning", rating: 4, notes: "Explained rollback checks." }],
      overallRating: 4,
      strengths: "Specific verification examples.",
      concerns: "No large-scale incident example recorded.",
      notes: "Human-authored smoke scorecard.",
    }),
    201,
    "scorecard submission",
  );

  await expectStatus(
    json(`/api/organizations/${organizationId}/applications/${applicationId}/stage`, { stage: "OFFER" }, "PATCH"),
    200,
    "application transition to OFFER",
  );
  await expectStatus(
    json(`/api/organizations/${organizationId}/applications/${applicationId}/offer`, {
      title: "Release Engineer offer",
      details: "Offer details for the verified release journey.",
      expiresAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
    }),
    201,
    "offer creation",
  );
  await expectStatus(
    json(`/api/organizations/${organizationId}/applications/${applicationId}/offer`, { status: "SENT" }, "PATCH"),
    200,
    "offer sending",
  );
  const portal = await expectStatus(
    request(`/api/portal/organizations/${organizationId}/applications`, {}, "candidate"),
    200,
    "candidate portal application lookup",
  );
  if (portal.applications[0]?.offer?.status !== "SENT") {
    throw new Error("Candidate portal did not expose the sent offer");
  }
  await expectStatus(
    json(`/api/portal/organizations/${organizationId}/applications/${applicationId}/offer`, {
      status: "ACCEPTED",
      responseNote: "Accepted through the release smoke journey.",
    }, "POST", "candidate"),
    200,
    "candidate offer response",
  );
  await expectStatus(
    json(`/api/organizations/${organizationId}/applications/${applicationId}/stage`, { stage: "HIRED" }, "PATCH"),
    200,
    "human application transition to HIRED",
  );

  const candidateNotifications = await expectStatus(
    request(`/api/notifications?organizationId=${organizationId}`, {}, "candidate"),
    200,
    "candidate notification lookup",
  );
  const candidateNotificationTypes = new Set(
    candidateNotifications.notifications.map((item) => item.type),
  );
  if (!candidateNotificationTypes.has("ASSESSMENT_ASSIGNED") || !candidateNotificationTypes.has("OFFER_SENT")) {
    throw new Error("Candidate notifications did not cover assessment and offer events");
  }
  const adminNotifications = await expectStatus(
    request(`/api/notifications?organizationId=${organizationId}`),
    200,
    "admin notification lookup",
  );
  if (!adminNotifications.notifications.some((item) => item.type === "OFFER_RESPONSE")) {
    throw new Error("Offer response notification was not delivered to the creator");
  }

  const analytics = await expectStatus(
    request(`/api/organizations/${organizationId}/analytics`),
    200,
    "analytics lookup",
  );
  if (analytics.applications.total !== 1) throw new Error("Analytics smoke mismatch");
  const audit = await expectStatus(
    request(`/api/organizations/${organizationId}/audit-logs?action=APPLICATION_STAGE_CHANGED`),
    200,
    "audit lookup",
  );
  if (audit.auditLogs.length !== 6) throw new Error("Application audit smoke mismatch");

  const digest = createHash("sha256")
    .update(`${organizationId}:${applicationId}`)
    .digest("hex")
    .slice(0, 12);
  console.log(JSON.stringify({
    status: "passed",
    authentication: true,
    isolation: true,
    rbac: true,
    crossSiteProtection: true,
    evidenceMatrix: true,
    applicationLifecycle: true,
    assessmentPortal: true,
    interviewScorecard: true,
    offerPortal: true,
    notifications: true,
    analytics: true,
    auditEvents: 6,
    run: digest,
  }));
} finally {
  if (organizationId) {
    await pool.query('DELETE FROM "Organization" WHERE "id"=$1', [organizationId]);
  }
  await pool.query('DELETE FROM "User" WHERE "email" = ANY($1)', [Object.values(accounts)]);
  await pool.end();
  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/pid", String(server.pid), "/t", "/f"], {
        stdio: "ignore",
      });
    } catch {}
  } else {
    server.kill("SIGTERM");
  }
  await rm(".smoke-runtime", { recursive: true, force: true }).catch(() => undefined);
}
