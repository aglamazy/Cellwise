/**
 * Deletes a user account by email. Sessions cascade; puzzles they created are
 * kept but become ownerless (puzzles.user_id is ON DELETE SET NULL).
 *
 * Usage: npx tsx scripts/delete-user.ts <email>
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

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Usage: npx tsx scripts/delete-user.ts <email>");
  process.exit(1);
}

const sql = neon(connectionString);

async function deleteUser() {
  const rows = await sql`
    DELETE FROM users WHERE email = ${email} RETURNING id, email, name
  `;

  if (rows.length === 0) {
    console.log(`No user found with email ${email}`);
    return;
  }

  for (const user of rows) {
    console.log(`Deleted ${user.email} (${user.id}, "${user.name}")`);
  }
}

deleteUser().catch((e) => {
  console.error(e);
  process.exit(1);
});
