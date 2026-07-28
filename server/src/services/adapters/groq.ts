import type { ProviderAdapter, HealthCheckResult } from "../provider-adapter.js";
import { TEST_PROMPTS } from "../provider-adapter.js";

/**
 * Groq Provider Adapter.
 *
 * Groq provides ultra-fast inference on Llama, Gemma, and Mixtral models.
 * API format: OpenAI-compatible /v1/chat/completions
 */
export class GroqAdapter implements ProviderAdapter {
  readonly slug = "groq";
  readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(apiKey: string, baseUrl = "https://api.groq.com/openai/v1") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async listModels(): Promise<{ slug: string; name: string }[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: { "Authorization": `Bearer ${this.apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`Groq listModels failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { data: Array<{ id: string }> };

    return data.data.map(m => ({
      slug: m.id,
      name: m.id,
    }));
  }

  async healthCheck(modelSlug: string): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelSlug,
          messages: [{ role: "user", content: this.getTestPrompt("DEFAULT") }],
          max_tokens: 10,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const speedMs = Date.now() - startTime;

      if (response.ok) {
        return {
          status: "ONLINE",
          speedMs,
          errorMessage: null,
        };
      }

      const errorBody = await response.text().catch(() => "No error body");
      return {
        status: response.status === 429 ? "DEGRADED" : "OFFLINE",
        speedMs: null,
        errorMessage: `${response.status} ${response.statusText}: ${errorBody.slice(0, 200)}`,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          status: "OFFLINE",
          speedMs: null,
          errorMessage: "Request timed out (15s)",
        };
      }
      return {
        status: "OFFLINE",
        speedMs: null,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  getTestPrompt(category: string): string {
    return TEST_PROMPTS[category] ?? TEST_PROMPTS.DEFAULT;
  }
}