# Deployment

This guide produces a public demo URL with a free-tier stack: Render for the Docker web service, Neon for PostgreSQL, Cloudflare R2 for private résumé objects, and Resend for email.

## 1. Rotate exposed credentials

Create a new Mistral API key before deployment. Do not reuse a key pasted into chat, screenshots, issues, or logs. Revoke the old key after the replacement is confirmed.

## 2. Create PostgreSQL on Neon

1. Create a Neon project in a region close to the Render service.
2. Copy its PostgreSQL connection string, including `sslmode=require` when Neon supplies it.
3. From this repository, apply all committed migrations to Neon:

```powershell
$env:DATABASE_URL='postgresql://...'
npm run db:migrate:deploy
npm run db:migrate:status
Remove-Item Env:DATABASE_URL
```

Use a direct connection for the migration command. Store the application connection string as Render's `DATABASE_URL`; never commit either value.

Neon is preferred over Render Free Postgres for the demo because Render's free database currently expires after 30 days. Review the current [Neon plans](https://neon.com/pricing) and [Render free-tier limits](https://render.com/docs/free) before submission.

## 3. Create private résumé storage on Cloudflare R2

1. In Cloudflare, open **Storage & databases > R2** and create a Standard bucket such as `evidencehire-resumes`.
2. Keep public access disabled.
3. Create an R2 API token scoped to read and write only that bucket.
4. Save the access key ID, secret access key, bucket name, and S3 endpoint shown by Cloudflare.

Render values:

```text
RESUME_STORAGE_DRIVER=s3
S3_BUCKET=evidencehire-resumes
S3_REGION=auto
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_FORCE_PATH_STYLE=false
AWS_ACCESS_KEY_ID=<R2 access key ID>
AWS_SECRET_ACCESS_KEY=<R2 secret access key>
```

R2's S3 API and current free allowance are documented in the [R2 S3 guide](https://developers.cloudflare.com/r2/get-started/s3/) and [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

## 4. Configure Resend

1. Create a Resend account and API key.
2. For real judge registrations, verify a sender domain and use an address on that domain.
3. Set `EMAIL_FROM` to the verified sender.

```text
EMAIL_PROVIDER=resend
EMAIL_FROM=EvidenceHire <noreply@your-domain.example>
RESEND_API_KEY=<Resend API key>
```

Resend's free plan currently includes 3,000 emails per month and 100 per day. The `onboarding@resend.dev` testing sender is suitable only for restricted testing; use a verified domain when judges need to register their own addresses. Check [Resend pricing](https://resend.com/pricing) before deployment.

## 5. Create the Render Blueprint

1. Sign in to Render and choose **New > Blueprint**.
2. Connect `nischala755/EvidenceHire` and select `render.yaml`.
3. Choose the Free instance and enter every prompted secret.
4. Use these values:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon application connection string |
| `S3_BUCKET` | R2 bucket name |
| `S3_ENDPOINT` | R2 S3 endpoint |
| `AWS_ACCESS_KEY_ID` | R2 token access key |
| `AWS_SECRET_ACCESS_KEY` | R2 token secret |
| `EMAIL_FROM` | Verified Resend sender |
| `RESEND_API_KEY` | Resend API key |
| `MISTRAL_API_KEY` | Newly rotated Mistral key |

`APP_URL` does not need to be hardcoded on Render. The application uses Render's HTTPS `RENDER_EXTERNAL_URL` for configuration checks and email links. For another host, set `APP_URL=https://your-host.example` explicitly.

The Blueprint uses the repository Dockerfile, runs as a non-root user, and checks `/api/health/database`. Every successful push to `main` triggers a deploy.

## 6. Validate the public deployment

Let the first Render request wake the service, then run:

```powershell
$appUrl='https://your-service.onrender.com'
Invoke-RestMethod "$appUrl/api/health"
Invoke-RestMethod "$appUrl/api/health/database"
```

Both responses must report `status: ok`. Then manually verify:

1. Register and receive a real verification email.
2. Create an organization, job, requirements, candidate, and application.
3. Upload a small genuine PDF or DOCX résumé.
4. Parse it, run Mistral analysis, and confirm source-backed excerpts render.
5. Move one valid pipeline stage and confirm an invalid transition is rejected.
6. Submit one scorecard and generate its bounded summary.
7. Confirm another organization cannot open the first organization's URL.

Do not submit the deployment link until this journey passes against the public environment.

## Production environment reference

```text
APP_ENV=production
APP_URL=https://your-host.example       # optional on Render
DATABASE_URL=postgresql://...
RESUME_STORAGE_DRIVER=s3
S3_BUCKET=private-resumes
S3_REGION=auto
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_FORCE_PATH_STYLE=false
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
EMAIL_PROVIDER=resend
EMAIL_FROM=EvidenceHire <noreply@your-domain.example>
RESEND_API_KEY=...
MISTRAL_API_KEY=...
MISTRAL_MODEL=mistral-small-latest
```

Validate a complete environment without printing secrets:

```bash
npm run check:production
```

## Release and rollback

Before a release, run `npm run verify:release` against an isolated test database and apply `npm run db:migrate:deploy` to the target database. Render's free web service does not support a pre-deploy command, so migration is an explicit release step.

Application rollback uses one of Render's two retained free-service deploys. Migrations are forward-only: never edit an applied migration. For an incompatible schema incident, stop writes, restore the matching database backup, and redeploy the matching application revision.

Render Free sleeps after 15 minutes of inactivity, has an ephemeral filesystem, and does not provide shell access. It is appropriate for a hackathon demonstration, not a production hiring system. Resume objects must remain in R2, and the process-local rate limiter is appropriate only for the single free instance.
