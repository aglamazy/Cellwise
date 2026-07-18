/**
 * Runs the schema migrations against the database in .env.local.
 *
 * This is the bootstrap path: /api/migrate is admin-only, and a fresh database
 * has no admin yet. Safe to re-run — every statement is CREATE/ALTER ... IF NOT
 * EXISTS.
 *
 * Usage: npm run db:migrate
 */
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const { runMigrations } = await import("../src/lib/migrations");
  await runMigrations();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
