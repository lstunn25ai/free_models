import { prisma } from "../config/database.js";
import { getConfig } from "../config/env.js";
import { OpenRouterAdapter } from "./adapters/openrouter.js";
import { GroqAdapter } from "./adapters/groq.js";
import { GeminiAdapter } from "./adapters/gemini.js";
import { NvidiaAdapter } from "./adapters/nvidia.js";
import { OpenAICompatibleAdapter } from "./adapters/openai-compatible.js";
import { OllamaAdapter } from "./adapters/ollama.js";
import type { ProviderAdapter, HealthCheckResult } from "./provider-adapter.js";

/**
 * Registry of all available provider adapters.
 *
 * Each adapter is initialized with its API key from the environment.
 * Adapters are lazy-loaded — they're only created when the provider
 * is actually configured with a valid key.
 */
let adapterRegistry: Map<string, ProviderAdapter> | null = null;

function getAdapters(): Map<string, ProviderAdapter> {
  if (adapterRegistry) return adapterRegistry;

  const config = getConfig();
  const adapters = new Map<string, ProviderAdapter>();

  // OpenRouter
  if (config.OPENROUTER_API_KEY) {
    adapters.set("openrouter", new OpenRouterAdapter(config.OPENROUTER_API_KEY));
  }

  // Groq
  if (config.GROQ_API_KEY) {
    adapters.set("groq", new GroqAdapter(config.GROQ_API_KEY));
  }

  // Gemini
  if (config.GEMINI_API_KEY) {
    adapters.set("gemini", new GeminiAdapter(config.GEMINI_API_KEY));
  }

  if (config.NVIDIA_NIM_API_KEY) {
    adapters.set("nvidia", new NvidiaAdapter(config.NVIDIA_NIM_API_KEY));
  }

  const openAICompatibleProviders = [
    ["deepseek", config.DEEPSEEK_API_KEY, "https://api.deepseek.com"],
    ["huggingface", config.HUGGINGFACE_API_KEY, "https://router.huggingface.co/v1"],
    ["kimi", config.KIMI_API_KEY, "https://api.moonshot.ai/v1"],
    ["minimax", config.MINIMAX_API_KEY, "https://api.minimax.io/v1"],
    ["opencode", config.OPENCODE_API_KEY, "https://console.opencode.ai/inference/openai/v1"],
    ["zai", config.ZAI_API_KEY, "https://api.z.ai/api/paas/v4"],
  ] as const;
  for (const [slug, apiKey, baseUrl] of openAICompatibleProviders) {
    if (apiKey) adapters.set(slug, new OpenAICompatibleAdapter(slug, apiKey, baseUrl));
  }
  if (config.OLLAMA_API_KEY) adapters.set("ollama", new OllamaAdapter(config.OLLAMA_API_KEY));
  if (config.LONGCAT_API_KEY) {
    adapters.set("longcat", new OpenAICompatibleAdapter("longcat", config.LONGCAT_API_KEY, "https://api.longcat.chat/openai/v1"));
  }

  adapterRegistry = adapters;
  return adapters;
}

export function getProviderAdapter(slug: string): ProviderAdapter | undefined {
  return getAdapters().get(slug);
}

export function getProviderCredentialStatus(slug: string): {
  present: boolean;
  usable: boolean;
  diagnostic: string | null;
} {
  const config = getConfig();
  if (slug === "qoder") {
    const present = Boolean(config.QODER_API_KEY);
    return {
      present,
      usable: false,
      diagnostic: present
        ? "Qoder credential найден, но это Cloud/Teams API, а не OpenAI-compatible inference API. Для теста моделей нужен отдельный Qoder Cloud Agent adapter и environment ID."
        : null,
    };
  }
  const usable = Boolean(getProviderAdapter(slug));
  return { present: usable, usable, diagnostic: null };
}

/**
 * Run a health check on a provider→model link.
 *
 * 1. Look up the adapter for the provider.
 * 2. Call the adapter's healthCheck method with the model slug.
 * 3. Update the database with the result.
 * 4. Write a log entry to health_logs.
 */
export async function runHealthCheck(pm: {
  id: string;
  provider: { slug: string };
  model: { slug: string };
}): Promise<HealthCheckResult> {
  const adapters = getAdapters();
  const adapter = adapters.get(pm.provider.slug);

  if (!adapter) {
    // Provider has no configured adapter — mark as offline
    await prisma.providerModel.update({
      where: { id: pm.id },
      data: {
        status: "OFFLINE",
        errorMessage: "No API key configured for this provider",
        lastChecked: new Date(),
      },
    });

    return {
      status: "OFFLINE",
      speedMs: null,
      errorMessage: "No API key configured for this provider",
    };
  }

  // Run the health check
  const result = await adapter.healthCheck(pm.model.slug);

  // Update the provider_model in the database
  await prisma.providerModel.update({
    where: { id: pm.id },
    data: {
      status: result.status,
      speedMs: result.speedMs,
      errorMessage: result.errorMessage,
      lastChecked: new Date(),
    },
  });

  // Write a log entry
  await prisma.healthLog.create({
    data: {
      providerModelId: pm.id,
      status: result.status,
      pingMs: result.pingMs ?? result.speedMs ?? null,
      throughputTps: result.throughputTps ?? null,
      qualityScore: result.qualityScore ?? null,
      errorMessage: result.errorMessage,
    },
  });

  return result;
}

/**
 * Force refresh the adapter registry (e.g., after adding a new provider).
 */
export function resetAdapterRegistry(): void {
  adapterRegistry = null;
}
