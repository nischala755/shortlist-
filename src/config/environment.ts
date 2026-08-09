const allowedEnvironments = ["development", "test", "production"] as const;

export type AppEnvironment = (typeof allowedEnvironments)[number];

export function getEnvironment(value = process.env.APP_ENV): AppEnvironment {
  const environment = value ?? "development";

  if ((allowedEnvironments as readonly string[]).includes(environment)) {
    return environment as AppEnvironment;
  }

  throw new Error("APP_ENV must be development, test, or production");
}
