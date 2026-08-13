import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeResumeWithMistral, ResumeAnalysisProviderError, validateResumeAnalysis } from "./provider";

afterEach(() => vi.unstubAllEnvs());

describe("resume analysis provider", () => {
  it("accepts structured evidence grounded in the source text", () => {
    expect(
      validateResumeAnalysis(
        { summary: "Engineer", skills: ["TypeScript"], experienceHighlights: [], education: [], missingInformation: [], evidenceQuotes: ["TypeScript"] },
        "Ada used TypeScript.",
      ),
    ).toMatchObject({ summary: "Engineer", evidenceQuotes: ["TypeScript"] });
  });

  it("rejects evidence that is not present in the source", () => {
    expect(() => validateResumeAnalysis({ summary: "Engineer", skills: [], experienceHighlights: [], education: [], missingInformation: [], evidenceQuotes: ["Python"] }, "TypeScript")).toThrow(ResumeAnalysisProviderError);
  });

  it("returns the exact source excerpt when PDF layout changes only whitespace", () => {
    const sourceText = "Built APIs with TypeScript\nand PostgreSQL.";
    const analysis = validateResumeAnalysis(
      {
        summary: "Engineer",
        skills: ["TypeScript", "PostgreSQL"],
        experienceHighlights: [],
        education: [],
        missingInformation: [],
        evidenceQuotes: ["Built APIs with TypeScript and PostgreSQL."],
      },
      sourceText,
    );

    expect(analysis.evidenceQuotes).toEqual([sourceText]);
  });

  it("maps punctuation and casing differences back to exact source words", () => {
    const sourceText = "Designed TypeScript APIs — deployed on AWS.";
    const analysis = validateResumeAnalysis(
      {
        summary: "Engineer",
        skills: ["TypeScript", "AWS"],
        experienceHighlights: [],
        education: [],
        missingInformation: [],
        evidenceQuotes: ["DESIGNED TYPESCRIPT APIS, DEPLOYED ON AWS"],
      },
      sourceText,
    );

    expect(analysis.evidenceQuotes).toEqual(["Designed TypeScript APIs — deployed on AWS"]);
  });

  it("requires provider configuration", async () => {
    vi.stubEnv("MISTRAL_API_KEY", "");
    await expect(analyzeResumeWithMistral("resume")).rejects.toThrow("MISTRAL_API_KEY is not configured");
  });

  it("requests JSON analysis from Mistral", async () => {
    vi.stubEnv("MISTRAL_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ summary: "Engineer", skills: ["TypeScript"], experienceHighlights: [], education: [], missingInformation: [], evidenceQuotes: ["TypeScript"] }) } }] }), { status: 200 })));

    const result = await analyzeResumeWithMistral("TypeScript");

    expect(result.provider).toBe("mistral");
    expect(fetch).toHaveBeenCalledWith("https://api.mistral.ai/v1/chat/completions", expect.objectContaining({ method: "POST" }));
  });
});
