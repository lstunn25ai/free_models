import type { ProviderAdapter, HealthCheckResult, HealthStatus } from "../provider-adapter.js";
import { TEST_PROMPTS } from "../provider-adapter.js";

/**
 * OpenRouter Provider Adapter.
 *
 * OpenRouter is an aggregator — it proxies requests to 100+ underlying providers.
 * API format: OpenAI-compatible /v1/chat/completions
 */
export class OpenRouterAdapter implements ProviderAdapter {
  readonly slug: string = "openrouter";
  readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(apiKey: string, baseUrl = "https://openrouter.ai/api/v1") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async listModels(): Promise<{ slug: string; name: string; isFree: boolean; freeSource?: string }[]> {
    const response = await fetch(`${this.baseUrl}/models?output_modalities=all`, {
      headers: { "Authorization": `Bearer ${this.apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter listModels failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      data: Array<{ id: string; name?: string; pricing?: { prompt?: string; completion?: string } }>;
    };

    return data.data.map(m => ({
      slug: m.id,
      name: m.name ?? m.id,
      // The provider model id and zero token pricing are the only catalogue
      // signals used here; a candidate still requires a live test before approval.
      isFree: m.id.endsWith(":free") || (m.pricing?.prompt === "0" && m.pricing?.completion === "0"),
      freeSource: m.id.endsWith(":free") ? "OpenRouter :free catalog label" : (m.pricing?.prompt === "0" && m.pricing?.completion === "0" ? "OpenRouter zero token pricing" : undefined),
    }));
  }

  async healthCheck(modelSlug: string): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

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

      // Non-OK responses
      const status = mapHttpStatus(response.status);
      const errorBody = await response.text().catch(() => "No error body");
      return {
        status,
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

/**
 * Map HTTP status codes to our health status enum.
 *
 * - 200: ONLINE (all good)
 * - 401: OFFLINE (bad key — the model is effectively unreachable)
 * - 429: DEGRADED (rate limited — model works, but is throttled)
 * - 5xx: OFFLINE (server error — model is down)
 */
function mapHttpStatus(httpStatus: number): HealthStatus {
  if (httpStatus === 200) return "ONLINE";
  if (httpStatus === 429) return "DEGRADED";
  return "OFFLINE";
}
