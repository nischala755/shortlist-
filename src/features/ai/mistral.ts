export class MistralProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MistralProviderError";
  }
}

export async function requestMistralJson(system: string, user: string) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new MistralProviderError("MISTRAL_API_KEY is not configured");
  const model = process.env.MISTRAL_MODEL ?? "mistral-small-latest";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 3000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!response.ok) {
      throw new MistralProviderError(
        `Mistral request failed with status ${response.status}`,
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new MistralProviderError("Mistral response did not contain content");
    }

    try {
      return { provider: "mistral", model, value: JSON.parse(content) as unknown };
    } catch {
      throw new MistralProviderError("Mistral response was not valid JSON");
    }
  } catch (error) {
    if (error instanceof MistralProviderError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new MistralProviderError("Mistral request timed out");
    }
    throw new MistralProviderError("Mistral request failed");
  } finally {
    clearTimeout(timeout);
  }
}
