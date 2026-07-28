import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed script — initializes the database with:
 * 1. Three providers (OpenRouter, Groq, Gemini) — the MVP set
 * 2. A starter set of models across multiple categories
 *
 * Run with: npm run db:seed
 */

async function main() {
  console.log("Seeding database...");

  // ─── Providers ─────────────────────────────────────────
  const openrouter = await prisma.provider.upsert({
    where: { slug: "openrouter" },
    update: {},
    create: {
      name: "OpenRouter",
      slug: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      isEnabled: true,
    },
  });

  const groq = await prisma.provider.upsert({
    where: { slug: "groq" },
    update: {},
    create: {
      name: "Groq",
      slug: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      isEnabled: true,
    },
  });

  const gemini = await prisma.provider.upsert({
    where: { slug: "gemini" },
    update: {},
    create: {
      name: "Google Gemini",
      slug: "gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      isEnabled: true,
    },
  });

  console.log(`  ✓ Providers: ${[openrouter.name, groq.name, gemini.name].join(", ")}`);

  // ─── Models ────────────────────────────────────────────
  // Each model is linked to one or more providers via ProviderModel.
  const modelsData = [
    // Opus tier (heavy reasoning)
    { name: "DeepSeek V3", slug: "deepseek/deepseek-chat", category: "OPUS" as const, stars: 5.0, priority: "primary", advantage: "Top-tier reasoning", bestFor: "Complex code, math", whenToUse: "When you need Opus-level quality" },
    { name: "Qwen 2.5 72B", slug: "qwen/qwen-2.5-72b-instruct", category: "OPUS" as const, stars: 4.5, priority: "backup", advantage: "Large context window", bestFor: "Long documents, code", whenToUse: "When DeepSeek is rate-limited" },

    // Sonnet tier (balanced)
    { name: "Qwen 2.5 32B", slug: "qwen/qwen-2.5-32b-instruct", category: "SONNET" as const, stars: 4.5, priority: "primary", advantage: "Good balance of speed and quality", bestFor: "General chat, coding", whenToUse: "Default for most tasks" },
    { name: "Llama 3.1 70B", slug: "meta-llama/llama-3.1-70b-instruct", category: "SONNET" as const, stars: 4.0, priority: "backup", advantage: "Open weights, reliable", bestFor: "General chat", whenToUse: "When Qwen is unavailable" },

    // Haiku tier (fast)
    { name: "Gemma 2 9B", slug: "google/gemma-2-9b-it", category: "HAIKU" as const, stars: 4.0, priority: "fast", advantage: "Ultra-fast responses", bestFor: "Quick Q&A, simple tasks", whenToUse: "When speed > quality" },
    { name: "Llama 3.2 3B", slug: "meta-llama/llama-3.2-3b-instruct", category: "HAIKU" as const, stars: 3.5, priority: "fast", advantage: "Lightweight, fast", bestFor: "Simple tasks", whenToUse: "When Gemma is rate-limited" },

    // Embeddings
    { name: "BGE M3", slug: "baai/bge-m3", category: "EMBEDDINGS" as const, stars: 4.5, priority: "primary", advantage: "Multilingual embeddings", bestFor: "Vector search", whenToUse: "For RAG and semantic search" },
  ];

  for (const m of modelsData) {
    const model = await prisma.model.upsert({
      where: { slug: m.slug },
      update: {
        stars: m.stars,
        priority: m.priority,
        advantage: m.advantage,
        bestFor: m.bestFor,
        whenToUse: m.whenToUse,
      },
      create: {
        name: m.name,
        slug: m.slug,
        category: m.category,
        stars: m.stars,
        priority: m.priority,
        advantage: m.advantage,
        bestFor: m.bestFor,
        whenToUse: m.whenToUse,
      },
    });

    // Link model to OpenRouter (all models are available there)
    await prisma.providerModel.upsert({
      where: {
        modelId_providerId: {
          modelId: model.id,
          providerId: openrouter.id,
        },
      },
      update: {},
      create: {
        modelId: model.id,
        providerId: openrouter.id,
      },
    });

    // Link Gemma to Gemini provider too
    if (m.slug.includes("gemma")) {
      await prisma.providerModel.upsert({
        where: {
          modelId_providerId: {
            modelId: model.id,
            providerId: gemini.id,
          },
        },
        update: {},
        create: {
          modelId: model.id,
          providerId: gemini.id,
        },
      });
    }

    // Link Llama models to Groq too
    if (m.slug.includes("llama")) {
      await prisma.providerModel.upsert({
        where: {
          modelId_providerId: {
            modelId: model.id,
            providerId: groq.id,
          },
        },
        update: {},
        create: {
          modelId: model.id,
          providerId: groq.id,
        },
      });
    }

    console.log(`  ✓ Model: ${m.name} (${m.category})`);
  }

  console.log("\nSeed complete!");
  console.log(`  Providers: 3`);
  console.log(`  Models: ${modelsData.length}`);
  console.log(`  Provider-Model links: ${modelsData.length + 3}`); // extra links for gemma+gemini, llama+groq
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });