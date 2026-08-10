import { describe, expect, it } from "vitest";
import { getSessionToken } from "./session";

describe("getSessionToken", () => {
  it("reads the session cookie", () => {
    const request = new Request("http://localhost", {
      headers: {
        cookie: "theme=dark; evidencehire_session=session-token",
      },
    });

    expect(getSessionToken(request)).toBe("session-token");
  });

  it("returns null when the session cookie is absent", () => {
    expect(getSessionToken(new Request("http://localhost"))).toBeNull();
  });
});
