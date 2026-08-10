# EvidenceHire

EvidenceHire is an evidence-driven recruitment and applicant tracking platform.

The project is being developed in small, reviewable vertical slices for the DevFusion 4.O Developers Hackathon. The current milestone includes the initial organization, user, and membership data model. Authentication and roles are intentionally not implemented yet.

## Local setup

Requirements: Node.js 24 or newer, npm, and PostgreSQL.

```bash
npm install
Copy-Item .env.example .env
npm run dev
```

Set `DATABASE_URL` in `.env` to a PostgreSQL connection string before using the database health check.

Open `http://localhost:3000` and check `http://localhost:3000/api/health`.
The database check is available at `http://localhost:3000/api/health/database`.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run db:generate
```

Recruitment, authentication, and AI behavior are not included in this milestone.
