# Demo and verification

## Automated release gate

Use a disposable PostgreSQL database:

```bash
npm run verify:release
```

The gate checks lint, TypeScript, all unit and route tests, production compilation, CSP nonce rendering, migration status, production dependency vulnerabilities, and a smoke journey. The smoke journey creates temporary admin, candidate, and outsider users; proves isolation and RBAC; exercises evidence, assessment, interview, scorecard, offer, notification, analytics, and audit workflows; then removes its data.

Expected smoke summary resembles:

```json
{"status":"passed","authentication":true,"isolation":true,"rbac":true,"evidenceMatrix":true,"assessmentPortal":true,"interviewScorecard":true,"offerPortal":true,"notifications":true,"auditEvents":6}
```

## Judge demo

Prepare two verified accounts: one admin/recruiter and one candidate whose email matches a candidate record.

1. Create an organization and a draft job with three concrete requirements.
2. Publish the job, create the candidate, and add an application.
3. Upload a small PDF or DOCX resume and parse it.
4. If Mistral is configured, run resume analysis and grounded requirement assistance. Point out exact-quote validation and the fact that suggestions are not persisted as evidence.
5. Review the suggested follow-up questions, add human-reviewed evidence, and open the evidence matrix. Show covered and missing requirements.
6. Schedule an interview, submit a structured scorecard as the assigned interviewer, and generate a transient feedback summary.
7. Create and assign a coding assessment. In the candidate portal, start it, save a draft, and submit once. Explain that code is stored but never executed.
8. Draft and send an offer, then respond through the candidate portal.
9. Show notifications, organization analytics, and the audit review page.
10. Demonstrate that the second organization/user cannot access the first organization's URL.

Do not present AI mappings, questions, or feedback summaries as facts or decisions. The reviewer must verify source material, and only an authorized human can record evidence or move the application.

## Manual failure checks

- Upload a `.txt` file or rename a PDF to `.docx`: upload must be rejected.
- Submit malformed scorecard ratings: validation must return a client error.
- Attempt a backward/invalid pipeline transition: workflow validation must reject it.
- Access an organization route as a non-member: response must not expose its data.
- Access a candidate portal with a different email: access must fail.
- Start production with local storage or console email: startup must fail with configuration errors.

## Definition of verified

The MVP is verified when migrations are current, `verify:release` passes on the release commit, both deployed health endpoints are healthy, production email and object storage are exercised once, and the judge demo completes without direct database editing.
