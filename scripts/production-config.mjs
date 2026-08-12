export function productionConfigurationErrors(env = process.env) {
  const errors = [];
  if (env.APP_ENV !== "production") errors.push("APP_ENV must be production");
  if (!env.APP_URL?.startsWith("https://")) errors.push("APP_URL must use HTTPS");
  if (
    !env.DATABASE_URL?.startsWith("postgresql://") &&
    !env.DATABASE_URL?.startsWith("postgres://")
  ) {
    errors.push("DATABASE_URL must be PostgreSQL");
  }
  if (env.RESUME_STORAGE_DRIVER !== "s3") {
    errors.push("RESUME_STORAGE_DRIVER must be s3");
  }
  if (!env.S3_BUCKET) errors.push("S3_BUCKET is required");
  if (env.EMAIL_PROVIDER !== "resend") errors.push("EMAIL_PROVIDER must be resend");
  if (!env.EMAIL_FROM) errors.push("EMAIL_FROM is required");
  if (!env.RESEND_API_KEY) errors.push("RESEND_API_KEY is required");
  return errors;
}
