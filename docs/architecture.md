# Architecture

## Product boundary

EvidenceHire organizes evidence; it does not make employment decisions. The core relationship is:

```text
Organization
  -> Job -> JobRequirement
  -> Candidate -> Resume -> ResumeAnalysis
  -> Application -> stage history / interviews / assessment / offer
  -> CandidateEvidence -> optional JobRequirement
```

An evidence matrix joins a candidate's recorded evidence to the requirements of a specific job. A gap is deterministic: a requirement is missing when no evidence record references it. Coverage is a review aid, not a candidate score or decision.

## Runtime

- Next.js App Router renders the hiring workspace and candidate portal.
- Route handlers under `src/app/api` own validation, authentication, authorization, and orchestration.
- Domain validation and reports live under `src/features`.
- Prisma accesses PostgreSQL through `src/lib/db.ts`.
- Resume bytes use local storage in development and a private S3-compatible bucket in production.
- Authentication email uses a console transport in development and Resend in production.
- Mistral analysis is optional and server-side.

## Trust boundaries

Browser input is untrusted. Mutations require a same-origin request, authenticated session where applicable, scoped permission, validated payload, and organization-owned resource. Candidate routes additionally verify candidate role and email ownership. Cross-organization lookups return not found rather than revealing resource existence.

Role policy is centralized in `src/features/organizations/access.ts`:

| Role | Primary responsibility |
| --- | --- |
| Admin | Team membership, all recruiting operations, audit review |
| Recruiter | Jobs, candidates, pipeline, interviews, assessments, offers |
| Hiring manager | Pipeline decisions, scorecards, analytics, audit review |
| Interviewer | Assigned interviews and scorecards |
| Candidate | Email-bound candidate portal only |

## AI boundary

Resume text is treated as untrusted content, not model instructions. The model receives a fixed extraction schema and zero-temperature request. Responses must match that schema, and every evidence quote must be an exact substring of parsed text before persistence. Provider failure leaves the human workflow available and does not change applications, evidence, or offers.

Interview feedback remains the interviewer's structured scorecard. Evidence-gap detection is deterministic. Coding answers are never executed. These boundaries prevent an AI response from becoming a hiring action.

## Operational design

- `/api/health` is liveness; `/api/health/database` is readiness.
- Schema changes are forward Prisma migrations executed before application rollout.
- Audit records capture high-value workflow events and are read-only through the API.
- Security headers and mutation checks are enforced in `src/proxy.ts`.
- The current rate limiter is process-local and suitable for a single MVP instance. Multiple replicas require a shared limiter at the edge or in Redis.
