# Deployment

## Required services

Provision PostgreSQL, a private S3-compatible bucket, a Resend account with a verified sender, and an HTTPS hostname. Mistral is optional. Keep all bucket objects private; the application reads them server-side.

Required environment:

```text
APP_ENV=production
APP_URL=https://your-domain.example
DATABASE_URL=postgresql://...
RESUME_STORAGE_DRIVER=s3
S3_BUCKET=private-resumes
S3_REGION=your-region
EMAIL_PROVIDER=resend
EMAIL_FROM=EvidenceHire <noreply@your-domain.example>
RESEND_API_KEY=...
```

For Cloudflare R2, MinIO, or another S3-compatible service, also set `S3_ENDPOINT`; set `S3_FORCE_PATH_STYLE=true` only when the provider requires it. AWS can use workload identity instead of static access keys. Other providers generally require `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.

Validate secrets without printing them:

```bash
npm run check:production
```

## Container release

Build both targets from the same revision:

```bash
docker build --target migrator -t evidencehire-migrator .
docker build --target runner -t evidencehire .
```

Run the migration target once as the release step, then start the application:

```bash
docker run --rm --env-file .env.production evidencehire-migrator
docker run --env-file .env.production -p 3000:3000 evidencehire
```

Do not run development migrations in production. Do not start new application replicas until `prisma migrate deploy` succeeds.

## Release checklist

1. Use a clean checkout of the intended commit.
2. Run `npm ci` and `npm run verify:release` against an isolated test database.
3. Back up PostgreSQL according to the provider's procedure.
4. Build immutable migration and application images.
5. Run the migration image once.
6. Deploy one application instance and check both health endpoints.
7. Exercise login, organization access, resume upload/parse, one pipeline transition, and browser hydration under the CSP nonce.
8. Scale only after readiness is healthy.

## Rollback

Application rollback uses the previous image. Prisma migrations in this repository are forward-only; do not edit or reverse an applied migration automatically. For an incompatible schema incident, stop writes, restore the database backup, and deploy the matching prior image. Resume objects are content-addressed by server-generated keys but require independent bucket retention/versioning.

## External prerequisites and limits

- Real email delivery requires a verified Resend sender/domain.
- AI analysis requires a valid `MISTRAL_API_KEY`; provider errors do not block normal ATS workflows.
- The process-local rate limiter does not coordinate multiple replicas. Put distributed rate limiting at the ingress before scaling horizontally.
- Docker was not available on the development machine for the final local review; CI/build syntax and the Next standalone artifact were verified, but the image must be built once in the target registry before release.
- Nonce-based CSP makes all pages dynamically rendered. Do not cache HTML across users or strip the `Content-Security-Policy` header at the CDN.
