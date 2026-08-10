import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma } from "@/lib/db";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { GET as currentUser } from "@/app/api/auth/me/route";
import { POST as logout } from "@/app/api/auth/logout/route";

const runIntegrationTests = Boolean(process.env.DATABASE_URL);

describe.skipIf(!runIntegrationTests)("authentication integration flow", () => {
  const email = `integration-${Date.now()}@example.com`;
  const password = "integration secure password";

  beforeAll(async () => {
    await getPrisma().user.deleteMany({ where: { email } });
  });

  afterAll(async () => {
    await getPrisma().user.deleteMany({ where: { email } });
    await getPrisma().$disconnect();
  });

  it("registers, logs in, reads the session, and logs out", async () => {
    const registration = await register(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    );
    expect(registration.status).toBe(201);

    const loginResponse = await login(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    );
    expect(loginResponse.status).toBe(200);

    const cookie = loginResponse.headers.get("set-cookie");
    expect(cookie).toContain("evidencehire_session=");
    const sessionCookie = cookie?.split(";")[0] ?? "";

    const authenticated = await currentUser(
      new Request("http://localhost/api/auth/me", {
        headers: { cookie: sessionCookie },
      }),
    );
    expect(authenticated.status).toBe(200);

    const logoutResponse = await logout(
      new Request("http://localhost/api/auth/logout", {
        headers: { cookie: sessionCookie },
      }),
    );
    expect(logoutResponse.status).toBe(204);

    const afterLogout = await currentUser(
      new Request("http://localhost/api/auth/me", {
        headers: { cookie: sessionCookie },
      }),
    );
    expect(afterLogout.status).toBe(401);
  });
});
