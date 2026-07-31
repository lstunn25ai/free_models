import type { DiscoveredModel, HealthCheckResult, HealthStatus, ProviderAdapter } from "../provider-adapter.js";
import { TEST_PROMPTS } from "../provider-adapter.js";

type OpenAIModel = { id?: unknown; name?: unknown; pricing?: unknown; is_free?: unknown; free?: unknown };

/**
 * Adapter for providers exposing the standard OpenAI-compatible `/models`
 * and `/chat/completions` endpoints. Credentials stay server-side only.
 */
export class OpenAICompatibleAdapter implements ProviderAdapter {
  readonly baseUrl: string;

  constructor(readonly slug: string, private readonly apiKey: string, baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async listModels() {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`${this.slug} model discovery failed (${response.status})`);
    const body = await response.json() as { data?: OpenAIModel[] };
    return (body.data ?? []).flatMap((model) => typeof model.id === "string" && model.id.length <= 200
      ? [{ slug: model.id, name: typeof model.name === "string" ? model.name : model.id, ...catalogTariffEvidence(this.slug, model) }]
      : []);
  }

  async healthCheck(modelSlug: string): Promise<HealthCheckResult> {
    const startedAt = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelSlug, messages: [{ role: "user", content: this.getTestPrompt("DEFAULT") }], max_tokens: 10, temperature: 0 }),
        signal: AbortSignal.timeout(15_000),
      });
      if (response.ok) return { status: "ONLINE", speedMs: Date.now() - startedAt, errorMessage: null };
      return { status: mapHttpStatus(response.status), speedMs: null, errorMessage: `${this.slug} test failed (${response.status})` };
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      return { status: "OFFLINE", speedMs: null, errorMessage: timedOut ? "Request timed out (15s)" : `${this.slug} is unavailable` };
    }
  }

  getTestPrompt(category: string): string {
    return TEST_PROMPTS[category] ?? TEST_PROMPTS.DEFAULT;
  }
}

function catalogTariffEvidence(slug: string, model: OpenAIModel): Pick<DiscoveredModel, "catalogTariff" | "catalogLimit" | "catalogPeriod" | "catalogTariffSource"> {
  if (model.is_free === true || model.free === true) {
    return {
      catalogTariff: "LIMITED",
      catalogLimit: "Provider rate limits may apply",
      catalogPeriod: "Provider-defined",
      catalogTariffSource: `${slug} explicit free catalog flag`,
    };
  }
  const priceRecord = model.pricing;
  if (!priceRecord || typeof priceRecord !== "object" || Array.isArray(priceRecord)) return {};
  const prices = numericValues(priceRecord);
  if (prices.some((value) => value > 0)) {
    return { catalogTariff: "PAID", catalogTariffSource: `${slug} non-zero catalog pricing` };
  }
  if (prices.length > 0 && prices.every((value) => value === 0)) {
    return {
      catalogTariff: "LIMITED",
      catalogLimit: "Provider rate limits may apply",
      catalogPeriod: "Provider-defined",
      catalogTariffSource: `${slug} zero pricing catalog evidence`,
    };
  }
  return {};
}

function numericValues(value: unknown): number[] {
  if (typeof value === "number" && Number.isFinite(value)) return [value];
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? [parsed] : [];
  }
  if (Array.isArray(value)) return value.flatMap(numericValues);
  if (value && typeof value === "object") return Object.values(value).flatMap(numericValues);
  return [];
}

function mapHttpStatus(status: number): HealthStatus {
  return status === 429 ? "DEGRADED" : "OFFLINE";
}
