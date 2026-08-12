# EvidenceHire

EvidenceHire is an evidence-driven applicant tracking system. Hiring teams define job requirements, collect candidate evidence, review gaps, and record structured interviews while authorized people retain every hiring decision.

AI is deliberately narrow: it extracts and summarizes resume content, maps exact source quotes, and identifies missing information. It cannot hire or reject, change pipeline stages, bypass permissions, or create candidate evidence.

## MVP capabilities

- Account registration, verification, password reset, sessions, and device logout
- Organization isolation and role-based access for admins, recruiters, hiring managers, interviewers, and candidates
- Jobs and requirements, candidates, applications, and stage history
- PDF/DOCX upload, parsing, grounded Mistral analysis, candidate evidence, evidence matrix, and gap reports
- Interview scheduling, structured scorecards, coding assessments, candidate portal, and offer responses
- Notifications, analytics, immutable audit review, security controls, CI, smoke tests, and container deployment

See [Architecture](docs/architecture.md), [Deployment](docs/deployment.md), [Demo and verification](docs/demo-and-verification.md), and [Roadmap completion](docs/roadmap-completion.md).

## Requirements

- Node.js 22
- npm
- PostgreSQL 15 or newer
- Docker only for container deployment

## Local setup

```powershell
Copy-Item .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Set `DATABASE_URL` in `.env`:

```text
postgresql://evidencehire_app:your-password@localhost:5432/evidencehire?schema=public
```

Development defaults to console email and filesystem resume storage. `MISTRAL_API_KEY` is optional; all non-AI workflows work without it. Never commit `.env` or candidate files.

Health endpoints:

- `GET /api/health` checks the web process.
- `GET /api/health/database` checks database readiness.

## Verification

```bash
npm run verify
npm run test:coverage
npm run verify:release
```

`verify:release` runs lint, type checking, 242 automated tests, production build, migration status, dependency audit, and a database-backed smoke journey. It requires an available test database and briefly starts the app on port `3111` by default.

## Production services

Production fails fast unless these boundaries are configured:

- HTTPS `APP_URL`
- managed PostgreSQL `DATABASE_URL`
- private S3-compatible resume bucket
- Resend sender and API key

Check configuration with `npm run check:production`. Run database migrations as a release step before starting the application. Detailed commands and rollback guidance are in [docs/deployment.md](docs/deployment.md).

## Important safety boundaries

- Session and one-time tokens are stored as hashes.
- Every organization route checks membership, permission, and resource ownership.
- Candidate portal access is bound to a candidate-role membership and matching email.
- Resume size, MIME type, extension, and storage keys are validated.
- AI evidence quotes must occur verbatim in parsed resume text.
- Coding submissions are stored as text and never executed.
- Only humans move applications or send/respond to offers.

Report security issues privately to the maintainers. Do not include credentials or candidate data in public issues.

## Development discipline

Keep changes in independently testable vertical slices. Each change needs a domain purpose, authorization boundary, validation and error cases, focused tests, a passing release gate, and a commit message that names the milestone. Do not rewrite applied migrations.
