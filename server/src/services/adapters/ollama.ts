import type { HealthCheckResult, HealthStatus, ProviderAdapter } from "../provider-adapter.js";
import { TEST_PROMPTS } from "../provider-adapter.js";

/** Ollama Cloud uses its native `/api/tags` and `/api/chat` endpoints. */
export class OllamaAdapter implements ProviderAdapter {
  readonly slug = "ollama";
  readonly baseUrl: string;

  constructor(private readonly apiKey: string, baseUrl = "https://ollama.com") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async listModels() {
    const response = await fetch(`${this.baseUrl}/api/tags`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Ollama model discovery failed (${response.status})`);
    const body = await response.json() as { models?: Array<{ name?: unknown; model?: unknown }> };
    return (body.models ?? []).flatMap((model) => {
      const id = typeof model.model === "string" ? model.model : model.name;
      return typeof id === "string" && id.length <= 200 ? [{ slug: id, name: id }] : [];
    });
  }

  async healthCheck(modelSlug: string): Promise<HealthCheckResult> {
    const startedAt = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelSlug, messages: [{ role: "user", content: this.getTestPrompt("DEFAULT") }], stream: false }),
        signal: AbortSignal.timeout(15_000),
      });
      if (response.ok) return { status: "ONLINE", speedMs: Date.now() - startedAt, errorMessage: null };
      return { status: response.status === 429 ? "DEGRADED" : "OFFLINE", speedMs: null, errorMessage: `Ollama test failed (${response.status})` };
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      return { status: "OFFLINE", speedMs: null, errorMessage: timedOut ? "Request timed out (15s)" : "Ollama is unavailable" };
    }
  }

  getTestPrompt(category: string): string {
    return TEST_PROMPTS[category] ?? TEST_PROMPTS.DEFAULT;
  }
}
