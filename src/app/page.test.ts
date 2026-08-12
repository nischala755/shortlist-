import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("landing page", () => {
  it("states the product boundary and exposes authentication routes", () => {
    const markup = renderToStaticMarkup(HomePage());

    expect(markup).toContain("Hiring decisions grounded in evidence");
    expect(markup).toContain("AI assists. People decide.");
    expect(markup).toContain('href="/register"');
    expect(markup).toContain('href="/login"');
  });
});
