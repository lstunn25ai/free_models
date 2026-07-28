import { prisma } from "../config/database.js";
import { getProviderAdapter } from "./health-check.js";

const PROVIDERS = [
  { slug: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1" },
  { slug: "gemini", name: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta" },
  { slug: "nvidia", name: "NVIDIA NIM", baseUrl: "https://integrate.api.nvidia.com/v1" },
  { slug: "groq", name: "Groq", baseUrl: "https://api.groq.com/openai/v1" },
] as const;

export async function bootstrapProviders(): Promise<void> {
  await Promise.all(PROVIDERS.map((provider) => prisma.provider.upsert({
    where: { slug: provider.slug },
    update: { name: provider.name, baseUrl: provider.baseUrl, isEnabled: Boolean(getProviderAdapter(provider.slug)) },
    create: { ...provider, isEnabled: Boolean(getProviderAdapter(provider.slug)) },
  })));
}
