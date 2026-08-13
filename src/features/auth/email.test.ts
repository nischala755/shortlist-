import { afterEach, describe, expect, it, vi } from "vitest";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("authentication email delivery", () => {
  it("uses the console transport outside production", async () => {
    process.env.APP_ENV = "development";
    process.env.EMAIL_PROVIDER = "console";
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await sendVerificationEmail("person@example.com", "verification-token");

    expect(info).toHaveBeenCalledWith(
      expect.stringContaining("recipient=person@example.com"),
    );
  });

  it("delivers reset links through Resend without exposing the API key", async () => {
    process.env.APP_ENV = "production";
    process.env.APP_URL = "https://hire.example.com";
    process.env.EMAIL_PROVIDER = "resend";
    process.env.EMAIL_FROM = "EvidenceHire <noreply@example.com>";
    process.env.RESEND_API_KEY = "secret-key";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ id: "email-id" }), { status: 200 }));

    await sendPasswordResetEmail("person@example.com", "reset-token");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(request?.headers).toMatchObject({ authorization: "Bearer secret-key" });
    expect(request?.body).toContain(
      "https://hire.example.com/reset-password?token=reset-token",
    );
  });

  it("uses Render's public URL when APP_URL is not set", async () => {
    delete process.env.APP_URL;
    process.env.APP_ENV = "production";
    process.env.RENDER_EXTERNAL_URL = "https://evidencehire.onrender.com";
    process.env.EMAIL_PROVIDER = "resend";
    process.env.EMAIL_FROM = "EvidenceHire <noreply@example.com>";
    process.env.RESEND_API_KEY = "secret-key";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    await sendVerificationEmail("person@example.com", "token");

    expect(fetchMock.mock.calls[0][1]?.body).toContain(
      "https://evidencehire.onrender.com/verify-email?token=token",
    );
  });

  it("fails closed when production email is not configured", async () => {
    process.env.APP_ENV = "production";
    process.env.EMAIL_PROVIDER = "console";
    await expect(
      sendVerificationEmail("person@example.com", "token"),
    ).rejects.toThrow("Email delivery is not configured");
  });
});
