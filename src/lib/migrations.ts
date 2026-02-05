import { sql } from "./db";

export async function runMigrations() {
  // Create users table
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Create sessions table for authentication
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Add user_id column to puzzles table if it doesn't exist
  await sql`
    ALTER TABLE puzzles
    ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE SET NULL
  `;

  // Create game_results table for storing completion times
  await sql`
    CREATE TABLE IF NOT EXISTS game_results (
      id TEXT PRIMARY KEY,
      puzzle_id TEXT NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      time_seconds INTEGER NOT NULL,
      completed_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(puzzle_id, user_id)
    )
  `;

  // Create index for faster queries
  await sql`
    CREATE INDEX IF NOT EXISTS idx_game_results_user_id ON game_results(user_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_game_results_puzzle_id ON game_results(puzzle_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_puzzles_user_id ON puzzles(user_id)
  `;

  console.log("Migrations completed successfully");
}
