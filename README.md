# EvidenceHire

> **Evidence before instinct. People before automation.**

[![CI](https://github.com/nischala755/EvidenceHire/actions/workflows/ci.yml/badge.svg)](https://github.com/nischala755/EvidenceHire/actions/workflows/ci.yml)

EvidenceHire is a multi-tenant applicant tracking system built around one hard rule: a hiring decision should be traceable to job requirements and source-backed candidate evidence.

Hiring teams define what a role requires, move applications through an explicit pipeline, collect evidence from resumes, interviews, and assessments, and see what is supported—or still missing—before a person makes the decision.

## The product thesis

Most recruiting software stores activity. EvidenceHire organizes reasoning.

For every application, the platform connects four domain records:

```text
JobRequirement -> CandidateEvidence -> Application -> Human decision
```

AI can extract, summarize, map, and suggest. It cannot hire, reject, rank, move a candidate, send an offer, bypass authorization, or turn its own output into accepted evidence.

| AI assists with | A human remains responsible for |
| --- | --- |
| Resume extraction and structured summaries | Verifying the source material |
| Requirement-to-resume mapping | Recording accepted candidate evidence |
| Evidence-gap discovery | Deciding what a gap means |
| Evidence-seeking interview questions | Conducting and scoring the interview |
| Structured scorecard summaries | Every pipeline and offer decision |

## What is shipped

- Secure registration, email verification, password reset, hashed sessions, and device logout
- Organization isolation with Admin, Recruiter, Hiring Manager, Interviewer, and Candidate roles
- Jobs, explicit requirements, candidates, applications, controlled stage transitions, and stage history
- Private PDF/DOCX résumé upload, server-side parsing, grounded Mistral analysis, and exact source-span validation
- Human-recorded candidate evidence, requirement-level evidence matrix, and deterministic gap reports
- Grounded requirement mappings and evidence-seeking interview questions that remain temporary review aids
- Interview scheduling with conflict detection, assigned interviewers, structured scorecards, and bounded feedback summaries
- Coding assessments with candidate drafts and one-time submission; submitted code is stored, never executed
- Candidate portal, offer drafting/sending/responding, notifications, organization analytics, and audit review
- Same-origin mutation protection, nonce-based CSP, upload boundaries, rate limiting, health checks, CI, Docker, and release smoke tests

## The evidence workflow

```mermaid
flowchart LR
    R[Job requirements] --> A[Application]
    C[Candidate resume] --> P[Parse and analyze]
    P --> M[Grounded mapping]
    M --> G[Visible evidence gaps]
    G --> I[Structured interview]
    I --> E[Human-reviewed evidence]
    E --> X[Evidence matrix]
    X --> H[Human decision]
    M -. never writes evidence .-> E
```

The matrix reports coverage, not candidate quality. A missing record means “we do not yet have evidence,” not “reject this person.”

## Trust boundaries

- Every organization resource is scoped by membership, permission, and ownership.
- Cross-organization lookups do not reveal whether another tenant's resource exists.
- Candidate portal access requires both the Candidate role and an email matching the candidate record.
- Resume files are validated by MIME type, extension, size, and server-generated storage key.
- Model-proposed quotes are accepted only when they map to a contiguous source span; the stored excerpt always comes from the parsed résumé.
- Model output never mutates applications, offers, scorecards, or accepted evidence.
- Decision language is rejected from generated scorecard summaries.
- Audit records expose high-value workflow events through a read-only review surface.

Read the deeper design in [Architecture](docs/architecture.md).

## Proving the MVP

The release gate exercises the application as a system, not as a collection of disconnected screens:

```bash
npm run verify:release
```

It runs lint, TypeScript, route and domain tests, a production build, CSP hydration checks, migration status, a production dependency audit, and a database-backed journey across authentication, tenant isolation, RBAC, evidence, assessments, interviews, offers, notifications, analytics, and audit logs.

Current repository shape:

| Proof point | Count |
| --- | ---: |
| Forward-only database migrations | 23 |
| Scoped API route handlers | 50 |
| Unit, route, integration, and UI test files | 91 |
| Roadmap slices represented in the MVP | 26 |

See [Demo and verification](docs/demo-and-verification.md) for the judge flow and deliberate failure checks.

## Run locally

Requirements: Node.js 22, npm, and PostgreSQL 15 or newer.

```powershell
Copy-Item .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

At minimum, set the local database URL in `.env`:

```text
DATABASE_URL=postgresql://evidencehire_app:your-password@localhost:5432/evidencehire?schema=public
```

Development uses console email and local résumé storage. Set `MISTRAL_API_KEY` to enable AI workflows. Never commit `.env`, candidate files, or provider credentials.

Health endpoints:

- `GET /api/health` — process liveness
- `GET /api/health/database` — PostgreSQL readiness

## Deploy free

The included [Render Blueprint](render.yaml) deploys the Docker application and gives it a public HTTPS `onrender.com` URL. The recommended demo stack is:

| Concern | Service |
| --- | --- |
| Application | Render Free web service |
| PostgreSQL | Neon Free |
| Private résumé objects | Cloudflare R2 Standard free tier |
| Transactional email | Resend Free |
| Grounded model calls | Mistral API |

Provision the database, bucket, email sender, and rotated Mistral key first; apply migrations; then create the Render Blueprint. Follow the exact values and validation steps in [Deployment](docs/deployment.md).

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/nischala755/EvidenceHire)

Render Free services sleep after inactivity, so allow roughly a minute for the first request after a cold start. The database and résumé objects remain durable because they live outside Render's ephemeral filesystem.

### Email delivery on the hosted demo

Production registration is intentionally fail-closed: an account is not usable until its verification message is delivered and the email address is confirmed.

Resend's shared `onboarding@resend.dev` sender is restricted to the email address associated with the Resend account. It is useful for an initial deployment check, but it cannot deliver verification links to arbitrary judge or candidate addresses. Before an open demo:

1. Add a domain you control in Resend and complete its DNS verification.
2. Set Render's `EMAIL_FROM` to `EvidenceHire <noreply@your-verified-domain.example>`.
3. Keep `EMAIL_PROVIDER=resend` and set a valid `RESEND_API_KEY`.
4. Redeploy and complete one registration using an external recipient address.

Until a sender domain is verified, use the Resend account owner's address for the registration demo. A `500` response during registration with another address usually means Resend rejected the recipient; check the Render logs and Resend delivery log. Full setup and validation steps are in [Deployment](docs/deployment.md#4-configure-resend).

## Repository guide

```text
src/app/          pages and scoped HTTP routes
src/components/   hiring-team and candidate workspaces
src/features/     domain rules, validation, reports, and provider boundaries
prisma/           relational model and forward-only migrations
scripts/          release checks, production startup, and smoke journeys
docs/             architecture, deployment, roadmap, and demo evidence
```

Contributions should preserve domain ownership and authorization boundaries instead of hiding them behind generic CRUD abstractions. See [Contributing](CONTRIBUTING.md).

## Status

The full MVP roadmap is implemented and locally release-verified. A deployment is considered ready only after both public health endpoints pass and the deployed environment completes one real email delivery, one private résumé upload/parse, one grounded analysis, and the documented judge journey.

Security issues should be reported privately to the maintainers. Do not place credentials or candidate data in public issues.
