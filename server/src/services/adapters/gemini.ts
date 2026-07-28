import type { ProviderAdapter, HealthCheckResult } from "../provider-adapter.js";
import { TEST_PROMPTS } from "../provider-adapter.js";

/**
 * Gemini Provider Adapter.
 *
 * Gemini has a non-OpenAI API format, but we normalize it to fit our interface.
 * Uses /v1beta/models/:model:generateContent endpoint.
 */
export class GeminiAdapter implements ProviderAdapter {
  readonly slug = "gemini";
  readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(apiKey: string, baseUrl = "https://generativelanguage.googleapis.com/v1beta") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async listModels(): Promise<{ slug: string; name: string }[]> {
    const response = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`);

    if (!response.ok) {
      throw new Error(`Gemini listModels failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { models: Array<{ name: string; displayName?: string }> };

    return data.models.map(m => ({
      slug: m.name.replace("models/", ""),
      name: m.displayName ?? m.name,
    }));
  }

  async healthCheck(modelSlug: string): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(
        `${this.baseUrl}/models/${modelSlug}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: this.getTestPrompt("DEFAULT") }] }],
            generationConfig: { maxOutputTokens: 10 },
          }),
          signal: controller.signal,
        }
      );

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