/**
 * Abstract Provider Adapter Interface.
 *
 * Every provider (OpenRouter, Groq, Gemini, etc.) implements this interface.
 * The rest of the system never knows which provider it's talking to —
 * it just calls these methods and gets normalized results.
 *
 * This is the Strategy Pattern: the caller doesn't care HOW the provider
 * responds, only THAT it responds in a consistent format.
 */

export interface ProviderAdapter {
  /** Provider slug — matches the Provider.slug in the database */
  readonly slug: string;

  /** Base URL for API calls */
  readonly baseUrl: string;

  /**
   * List all models available from this provider.
   * Used for NEW-model discovery.
   */
  listModels(): Promise<DiscoveredModel[]>;

  /**
   * Send a test prompt and measure response time.
   *
   * This is the core of the "Racing Engine" — every model in a category
   * receives the same prompt, and we measure who responds fastest.
   *
   * Returns null if the model is offline or errors out.
   */
  healthCheck(modelSlug: string): Promise<HealthCheckResult>;

  /**
   * Category-specific test prompts for the Racing Engine.
   * Each category gets a prompt that tests relevant capabilities.
   */
  getTestPrompt(category: string): string;
}

export interface DiscoveredModel {
  slug: string;
  name: string;
  category?: string;
}

export type HealthStatus = "ONLINE" | "OFFLINE" | "DEGRADED";

export interface HealthCheckResult {
  status: HealthStatus;
  speedMs: number | null;
  errorMessage: string | null;
  // Optional metrics for health_logs
  pingMs?: number;
  throughputTps?: number;
  qualityScore?: number;
}

/**
 * Test prompts per category.
 *
 * These are intentionally short — we want to measure response time,
 * not generate a long answer. The goal is speed comparison, not quality assessment.
 */
export const TEST_PROMPTS: Record<string, string> = {
  OPUS: "Write a Python function to reverse a linked list. Return only the code.",
  SONNET: "Explain the difference between Promise.all and Promise.allSettled in JavaScript.",
  HAIKU: "What is 17 * 23? Reply with just the number.",
  FABLE: "Write a 3-sentence opening for a sci-fi story about a Mars colony.",
  IMAGE: "A cyberpunk cat wearing a top hat, digital art",
  VIDEO: "A cat playing piano, 5 seconds",
  EMBEDDINGS: "embedding test",
  DEFAULT: "Hello, please respond with 'OK' to confirm you are working.",
};