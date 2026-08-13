import { beforeEach, describe, expect, it, vi } from "vitest";
import { resendEmailVerification } from "@/features/auth/email-verification";
import { POST } from "./route";

vi.mock("@/features/auth/email-verification", () => ({ resendEmailVerification: vi.fn() }));

describe("verification email resend", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normalizes an eligible email and returns a generic response", async () => {
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ email: " Person@Example.com " }) }));
    expect(response.status).toBe(202);
    expect(resendEmailVerification).toHaveBeenCalledWith("person@example.com");
    await expect(response.json()).resolves.toMatchObject({ status: "accepted" });
  });

  it("does not reveal whether provider delivery failed", async () => {
    vi.mocked(resendEmailVerification).mockRejectedValue(new Error("provider unavailable"));
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ email: "person@example.com" }) }));
    expect(response.status).toBe(202);
  });

  it("rejects malformed email without calling the service", async () => {
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ email: "invalid" }) }));
    expect(response.status).toBe(400);
    expect(resendEmailVerification).not.toHaveBeenCalled();
  });
});
