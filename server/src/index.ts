import { createApp } from "./app.js";
import { getConfig } from "./config/env.js";

async function main() {
  const config = getConfig();
  const app = createApp();

  const server = app.listen(config.PORT, () => {
    console.log(`\n┌──────────────────────────────────────────────────┐`);
    console.log(`│  Free Models Rating                              │`);
    console.log(`│  Environment: ${config.NODE_ENV.padEnd(33)}│`);
    console.log(`│  Port: ${String(config.PORT).padEnd(44)}│`);
    console.log(`│  Database: SQLite (Prisma)                       │`);
    console.log(`└──────────────────────────────────────────────────┘\n`);
  });

  // Graceful shutdown — close connections before the process dies
  const shutdown = (signal: string) => {
    console.log(`\n[${signal}] Shutting down gracefully...`);
    server.close(() => {
      console.log("[Server] HTTP server closed.");
      process.exit(0);
    });

    // Force exit after 10 seconds if connections don't close
    setTimeout(() => {
      console.error("[Server] Forcing shutdown after timeout.");
      process.exit(1);
    }, 10000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error("[FATAL] Failed to start server:", error);
  process.exit(1);
});