# EvidenceHire

EvidenceHire is an evidence-driven recruitment and applicant-tracking API for the DevFusion 4.O Developers Hackathon. It helps hiring teams organize candidate evidence against job requirements while keeping hiring decisions with authorized humans.

## Current scope

Implemented vertical slices include:

- foundation, PostgreSQL data model, authentication, sessions, email verification, and password reset
- responsive product landing page, authentication screens, and a server-protected workspace entry
- organization isolation and role-based access control
- jobs, requirements, candidates, applications, and stage history
- secure PDF/DOCX resume upload, parsing, and persisted text
- optional grounded Mistral resume analysis with exact evidence-quote validation
- candidate evidence, Evidence Matrix, and deterministic evidence-gap reporting
- interview scheduling and structured scorecards
- coding-assessment authoring and candidate draft/final submissions (code is stored, never executed)
- offer workflow, candidate responses, in-app notifications, analytics, and audit logs
- HTTP security headers, request-size protection, coverage reporting, and standalone deployment assets

AI assists with extraction and analysis only. It does not hire, reject, alter authorization, fabricate evidence, or change application stages.

## Requirements

- Node.js 22.3+ (Node.js 24 is also supported)
- npm
- PostgreSQL 15+
- Docker Desktop only if building the production image

## Local setup

Create a PostgreSQL database and application role, then configure a local environment file. Never put real credentials in `.env.example` or Git.

```powershell
Copy-Item .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Set `DATABASE_URL` in `.env`, for example:

```text
postgresql://evidencehire_app:your-password@localhost:5432/evidencehire?schema=public
```

Useful checks:

- `http://localhost:3000/api/health`
- `http://localhost:3000/api/health/database`

For local AI analysis, set `MISTRAL_API_KEY` and optionally `MISTRAL_MODEL`. The key must remain in the ignored `.env` file. The provider is optional; parsing and the rest of the application work without it.

## Verification

Run the full local gate before pushing:

```bash
npm run verify
```

This runs ESLint, TypeScript checking, all Vitest tests, and the production build. Additional commands:

```bash
npm test
npm run test:coverage
npm run db:migrate:deploy
```

The integration authentication test runs when `DATABASE_URL` is available and verifies registration, login, session lookup, logout, and session invalidation.

## API areas

Route handlers are under `src/app/api`:

- `/api/auth/*` — authentication and session lifecycle
- `/api/organizations/*` — organization-scoped recruiting operations
- `/api/portal/*` — candidate-only application, assessment, and offer access
- `/api/notifications` — current-user notification listing and read state
- `/api/organizations/{organizationId}/analytics` — scoped aggregate reporting
- `/api/organizations/{organizationId}/audit-logs` — authorized immutable event history

Browser routes include the product landing page, registration, email verification, login, password recovery, and protected workspaces under `/dashboard`. The organization workspace supports the complete job lifecycle: draft creation and editing, evidence requirements, publishing, filtering, and closing. Its candidate workspace supports organization-scoped search, profile creation and editing, PDF or DOCX resume upload and parsing, and application creation for published jobs. The pipeline board groups applications across seven explicit stages, filters them by job, allows only valid authorized transitions, and displays immutable stage history. The evidence workspace separates AI-assisted resume extraction from human-recorded evidence, maps reviewed evidence to applied-job requirements, and reports deterministic coverage gaps without making hiring decisions. The interview workspace schedules organization members without overlapping assignments, retains cancellations, and captures attributable structured scorecards only after interviews are completed.

Every organization-scoped route checks authentication, membership, permission, and resource ownership where applicable. Candidate portal routes additionally require a candidate membership and match the candidate profile to the authenticated email.

## Roles

- `ADMIN` — organization administration and all recruiting permissions
- `RECRUITER` — recruiting operations and workflow management
- `HIRING_MANAGER` — recruiting operations and workflow management
- `INTERVIEWER` — assigned interview and scorecard access
- `CANDIDATE` — candidate portal access only

Role permissions are defined in `src/features/organizations/access.ts`; do not duplicate permission logic in new routes.

## Database and migrations

Prisma schema: `prisma/schema.prisma`.

Local development:

```bash
npm run db:migrate
```

Deployment/release environments:

```bash
npm run db:migrate:deploy
```

Do not edit an existing migration after it has been applied. Add a new migration for every schema change and regenerate the client with `npm run db:generate`.

## Production deployment

The repository includes a standalone Next.js Docker deployment:

```bash
docker build -t evidencehire .
docker run --env-file .env.production -p 3000:3000 evidencehire
```

Run migrations as a release step before starting the container:

```bash
npm run db:migrate:deploy
```

Required production configuration includes `APP_ENV=production`, `APP_URL`, a managed PostgreSQL `DATABASE_URL`, and a strong application database password. Configure `MISTRAL_API_KEY` only when AI analysis is enabled.

Resume storage currently uses `RESUME_STORAGE_PATH`. A production deployment must mount durable storage or replace this adapter with object storage before relying on resumes across container replacements. The local filesystem is not durable container storage.

## Security boundaries

- session tokens are stored in hashed form and delivered through HTTP-only, same-site cookies
- organization and candidate ownership is checked at the route boundary
- resume types and size are validated; storage keys are path-checked
- AI evidence quotes must be exact substrings of parsed resume text
- candidate code submissions are never executed by the server
- audit persistence does not change business outcomes and audit records are query-only
- `src/proxy.ts` adds security headers and rejects oversized requests

Report security issues privately to the maintainers rather than opening a public issue with credentials or candidate data.

## Incremental development rules

Keep changes in independently understandable vertical slices. Each slice should have:

1. a clear domain purpose and authorization boundary
2. validation and explicit error cases
3. focused unit or route tests
4. a passing `npm run verify`
5. a meaningful commit describing the milestone

Do not commit `.env`, `coverage/`, uploaded resumes, generated Prisma output, or secrets.
