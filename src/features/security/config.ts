type ProductionEnvironment = Partial<Record<string, string | undefined>>;

export function productionConfigurationErrors(
  env: ProductionEnvironment = process.env,
) {
  if (env.APP_ENV !== "production") return [];

  const errors: string[] = [];
  const appUrl = env.APP_URL ?? env.RENDER_EXTERNAL_URL;
  if (!appUrl?.startsWith("https://")) errors.push("APP_URL must use HTTPS");
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
