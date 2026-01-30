import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const connectionString = process.env.STORAGE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL not found in environment");
  process.exit(1);
}

const sql = neon(connectionString);

async function deletePuzzles() {
  console.log("Deleting all existing puzzles...");

  const result = await sql`DELETE FROM puzzles RETURNING id, name`;

  console.log(`Deleted ${result.length} puzzles:`);
  for (const puzzle of result) {
    console.log(`  - ${puzzle.id}: ${puzzle.name}`);
  }

  console.log("Migration complete!");
}

deletePuzzles().catch(console.error);
