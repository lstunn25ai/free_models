import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [compose, dockerfile] = await Promise.all([
  readFile(resolve(root, "docker-compose.yml"), "utf8"),
  readFile(resolve(root, "Dockerfile"), "utf8"),
]);

assert.match(
  compose,
  /DATABASE_URL: \$\{DATABASE_URL:-file:\/app\/data\/dev\.db\}/,
  "The default database must live in the persistent data directory.",
);
assert.match(
  compose,
  /- db_data:\/app\/data/,
  "The persistent volume must not mask the runtime Prisma schema directory.",
);
assert.match(
  dockerfile,
  /COPY --from=builder \/app\/server\/prisma \/app\/prisma/,
  "The runtime image must retain an unmasked Prisma schema.",
);
assert.match(
  dockerfile,
  /prisma db push --schema=\/app\/prisma\/schema\.prisma/,
  "Runtime Prisma commands must use the image-owned schema.",
);

console.log("Prisma schema and persistent data paths are isolated.");
