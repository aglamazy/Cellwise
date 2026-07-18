/**
 * Read-only inspector for the Cellwise Neon DB.
 *
 * Usage:
 *   npx tsx scripts/inspect-db.ts users [limit]
 *   npx tsx scripts/inspect-db.ts puzzles [limit]
 *   npx tsx scripts/inspect-db.ts results [limit]
 *   npx tsx scripts/inspect-db.ts schema
 *   npx tsx scripts/inspect-db.ts recent      # newest rows across all tables
 */
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connectionString =
  process.env.STORAGE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL not found in environment");
  process.exit(1);
}

const sql = neon(connectionString);

const cmd = process.argv[2] || "recent";
const limit = Number(process.argv[3] || 20);

function show(label: string, rows: Record<string, unknown>[]) {
  console.log(`\n=== ${label} (${rows.length}) ===`);
  if (rows.length === 0) return;
  console.table(rows);
}

async function main() {
  switch (cmd) {
    case "schema": {
      const rows = await sql`
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `;
      show("schema", rows as Record<string, unknown>[]);
      break;
    }
    case "auth": {
      // Which password-hash scheme each account is on — "pbkdf2" is current,
      // anything else is a legacy unsalted SHA-256 awaiting upgrade at login.
      const rows = await sql`
        SELECT email,
               CASE WHEN password_hash LIKE 'pbkdf2$%' THEN 'pbkdf2'
                    ELSE 'legacy-sha256' END AS scheme,
               length(password_hash) AS hash_len,
               created_at
        FROM users ORDER BY created_at DESC LIMIT ${limit}
      `;
      show("auth", rows as Record<string, unknown>[]);
      break;
    }
    case "users": {
      const rows = await sql`
        SELECT id, name, email, role, created_at
        FROM users ORDER BY created_at DESC LIMIT ${limit}
      `;
      show("users", rows as Record<string, unknown>[]);
      break;
    }
    case "puzzles": {
      const rows = await sql`
        SELECT p.id, p.name, p.width, p.height,
               jsonb_array_length(p.regions) AS regions,
               jsonb_array_length(p.solution) AS crowns,
               p.user_id, u.email AS creator, p.created_at
        FROM puzzles p LEFT JOIN users u ON u.id = p.user_id
        ORDER BY p.created_at DESC LIMIT ${limit}
      `;
      show("puzzles", rows as Record<string, unknown>[]);
      break;
    }
    case "results": {
      const rows = await sql`
        SELECT * FROM results ORDER BY created_at DESC LIMIT ${limit}
      `;
      show("results", rows as Record<string, unknown>[]);
      break;
    }
    case "recent": {
      const users = await sql`
        SELECT id, name, email, role, created_at
        FROM users ORDER BY created_at DESC LIMIT ${limit}
      `;
      show("newest users", users as Record<string, unknown>[]);
      const puzzles = await sql`
        SELECT p.id, p.name, p.width, p.height,
               jsonb_array_length(p.regions) AS regions,
               jsonb_array_length(p.solution) AS crowns,
               p.user_id, p.created_at
        FROM puzzles p ORDER BY p.created_at DESC LIMIT ${limit}
      `;
      show("newest puzzles", puzzles as Record<string, unknown>[]);
      break;
    }
    default:
      console.error(`Unknown command: ${cmd}`);
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
