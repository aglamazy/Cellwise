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

async function setup() {
  console.log("Dropping old puzzles table...");
  await sql`DROP TABLE IF EXISTS puzzles`;

  console.log("Creating puzzles table...");
  await sql`
    CREATE TABLE puzzles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      regions JSONB NOT NULL,
      solution JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  console.log("Table created!");

  // Insert starter puzzle
  console.log("Inserting starter puzzle...");

  const starterPuzzle = {
    id: "puzzle-001",
    name: "Starter",
    width: 5,
    height: 5,
    regions: [
      {
        id: 0,
        color: "#ef4444",
        cells: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 1, col: 0 },
          { row: 1, col: 1 },
          { row: 2, col: 0 },
        ],
      },
      {
        id: 1,
        color: "#3b82f6",
        cells: [
          { row: 0, col: 2 },
          { row: 0, col: 3 },
          { row: 0, col: 4 },
          { row: 1, col: 2 },
        ],
      },
      {
        id: 2,
        color: "#22c55e",
        cells: [
          { row: 1, col: 3 },
          { row: 1, col: 4 },
          { row: 2, col: 3 },
          { row: 2, col: 4 },
          { row: 3, col: 4 },
        ],
      },
      {
        id: 3,
        color: "#eab308",
        cells: [
          { row: 2, col: 1 },
          { row: 2, col: 2 },
          { row: 3, col: 0 },
          { row: 3, col: 1 },
          { row: 4, col: 0 },
        ],
      },
      {
        id: 4,
        color: "#a855f7",
        cells: [
          { row: 3, col: 2 },
          { row: 3, col: 3 },
          { row: 4, col: 1 },
          { row: 4, col: 2 },
          { row: 4, col: 3 },
          { row: 4, col: 4 },
        ],
      },
    ],
    solution: [
      { row: 0, col: 3 },
      { row: 1, col: 0 },
      { row: 2, col: 2 },
      { row: 3, col: 4 },
      { row: 4, col: 1 },
    ],
  };

  await sql`
    INSERT INTO puzzles (id, name, width, height, regions, solution)
    VALUES (
      ${starterPuzzle.id},
      ${starterPuzzle.name},
      ${starterPuzzle.width},
      ${starterPuzzle.height},
      ${JSON.stringify(starterPuzzle.regions)},
      ${JSON.stringify(starterPuzzle.solution)}
    )
  `;

  console.log("Starter puzzle inserted!");
  console.log("Database setup complete!");
}

setup().catch(console.error);
