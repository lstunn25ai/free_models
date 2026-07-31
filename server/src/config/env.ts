/**
 * Centralized environment variable validation.
 *
 * All env vars are read once at startup and validated.
 * If a critical variable is missing, the process exits with a clear error message.
 * This prevents runtime failures 10 minutes into the app lifecycle.
 */

export interface EnvConfig {
  // Server
  PORT: number;
  NODE_ENV: "development" | "production" | "test";

  // Database
  DATABASE_URL: string;
  ADMIN_PASSWORD: string | undefined;

  // Provider API keys (optional — each provider can be configured via UI)
  OPENROUTER_API_KEY: string | undefined;
  GROQ_API_KEY: string | undefined;
  GEMINI_API_KEY: string | undefined;
  DEEPSEEK_API_KEY: string | undefined;
  HUGGINGFACE_API_KEY: string | undefined;
  NVIDIA_NIM_API_KEY: string | undefined;
  KIMI_API_KEY: string | undefined;
  MINIMAX_API_KEY: string | undefined;
  OPENCODE_API_KEY: string | undefined;
  CLOUDFLARE_API_TOKEN: string | undefined;
  ZAI_API_KEY: string | undefined;
  OLLAMA_API_KEY: string | undefined;
  QODER_API_KEY: string | undefined;
  LONGCAT_API_KEY: string | undefined;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`[FATAL] Missing required environment variable: ${key}`);
    console.error(`  Create a .env file in the project root or set it in your shell.`);
    process.exit(1);
  }
  return value;
}

function optionalEnv(key: string): string | undefined {
  return process.env[key] || undefined;
}

function parsePort(raw: string): number {
  const port = parseInt(raw, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error(`[FATAL] Invalid PORT value: "${raw}". Must be a number between 1 and 65535.`);
    process.exit(1);
  }
  return port;
}

export function loadEnv(): EnvConfig {
  return {
    PORT: parsePort(requireEnv("PORT")),
    NODE_ENV: (process.env.NODE_ENV as EnvConfig["NODE_ENV"]) ?? "development",
    DATABASE_URL: requireEnv("DATABASE_URL"),
    ADMIN_PASSWORD: optionalEnv("ADMIN_PASSWORD"),
    OPENROUTER_API_KEY: optionalEnv("OPENROUTER_API_KEY"),
    GROQ_API_KEY: optionalEnv("GROQ_API_KEY"),
    GEMINI_API_KEY: optionalEnv("GEMINI_API_KEY"),
    DEEPSEEK_API_KEY: optionalEnv("DEEPSEEK_API_KEY"),
    HUGGINGFACE_API_KEY: optionalEnv("HUGGINGFACE_API_KEY"),
    NVIDIA_NIM_API_KEY: optionalEnv("NVIDIA_NIM_API_KEY"),
    KIMI_API_KEY: optionalEnv("KIMI_API_KEY"),
    MINIMAX_API_KEY: optionalEnv("MINIMAX_API_KEY"),
    OPENCODE_API_KEY: optionalEnv("OPENCODE_API_KEY"),
    CLOUDFLARE_API_TOKEN: optionalEnv("CLOUDFLARE_API_TOKEN"),
    ZAI_API_KEY: optionalEnv("ZAI_API_KEY"),
    OLLAMA_API_KEY: optionalEnv("OLLAMA_API_KEY"),
    QODER_API_KEY: optionalEnv("QODER_API_KEY"),
    LONGCAT_API_KEY: optionalEnv("LONGCAT_API_KEY"),
  };
}

// Singleton — loaded once at startup
let _config: EnvConfig | undefined;

export function getConfig(): EnvConfig {
  if (!_config) {
    _config = loadEnv();
  }
  return _config;
}
