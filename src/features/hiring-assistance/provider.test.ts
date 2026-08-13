import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assistApplicationWithMistral,
  HiringAssistanceProviderError,
  summarizeFeedbackWithMistral,
  validateApplicationAssistance,
  validateFeedbackSummary,
} from "./provider";

const requirements = [
  { id: "req-1", title: "TypeScript", description: "Production TypeScript" },
  { id: "req-2", title: "Mentoring", description: "Supports other engineers" },
];
const originalKey = process.env.MISTRAL_API_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.MISTRAL_API_KEY;
  else process.env.MISTRAL_API_KEY = originalKey;
  vi.restoreAllMocks();
});

describe("grounded application assistance", () => {
  it("accepts complete mappings grounded in exact resume quotes", () => {
    const result = validateApplicationAssistance(
      {
        mappings: [
          { requirementId: "req-1", status: "SUPPORTED", rationale: "Explicit", evidenceQuotes: ["Built TypeScript services"] },
          { requirementId: "req-2", status: "NOT_FOUND", rationale: "Not described", evidenceQuotes: [] },
        ],
        interviewQuestions: [
          { requirementId: "req-2", question: "How have you supported another engineer?", rationale: "No mentoring example was found" },
        ],
      },
      requirements,
      "Built TypeScript services",
    );

    expect(result.mappings[0]).toMatchObject({ title: "TypeScript", status: "SUPPORTED" });
    expect(result.interviewQuestions).toHaveLength(1);
  });

  it("rejects fabricated quotes and omitted requirements", () => {
    expect(() =>
      validateApplicationAssistance(
        {
          mappings: [
            { requirementId: "req-1", status: "SUPPORTED", rationale: "Explicit", evidenceQuotes: ["Python"] },
          ],
          interviewQuestions: [],
        },
        requirements,
        "Built TypeScript services",
      ),
    ).toThrow(HiringAssistanceProviderError);
  });

  it("requests assistance from Mistral without persisting a decision", async () => {
    process.env.MISTRAL_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify({
              mappings: [
                { requirementId: "req-1", status: "SUPPORTED", rationale: "Explicit", evidenceQuotes: ["Built TypeScript services"] },
                { requirementId: "req-2", status: "NOT_FOUND", rationale: "Not described", evidenceQuotes: [] },
              ],
              interviewQuestions: [],
            }) } }],
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await assistApplicationWithMistral(
      requirements,
      "Built TypeScript services",
    );
    expect(result.assistance.mappings).toHaveLength(2);
  });
});

describe("structured feedback summaries", () => {
  it("accepts bounded observations and follow-up questions", () => {
    expect(
      validateFeedbackSummary({
        summary: "The scorecard records clear API examples.",
        strengths: ["Concrete API ownership example"],
        concerns: ["No incident response example recorded"],
        followUpQuestions: ["What was your role during a production incident?"],
      }),
    ).toMatchObject({ strengths: ["Concrete API ownership example"] });
  });

  it("rejects automated decision language", () => {
    expect(() =>
      validateFeedbackSummary({
        summary: "Recommend hiring this candidate.",
        strengths: [],
        concerns: [],
        followUpQuestions: [],
      }),
    ).toThrow("decision language");
  });

  it("summarizes only the supplied scorecard through Mistral", async () => {
    process.env.MISTRAL_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify({
              summary: "Clear examples were recorded.",
              strengths: ["Specific examples"],
              concerns: [],
              followUpQuestions: [],
            }) } }],
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await summarizeFeedbackWithMistral({ overallRating: 4 });
    expect(result.summary.summary).toBe("Clear examples were recorded.");
  });
});
