import { sql } from "./db";
import { Puzzle } from "@/types/game";

export async function getPuzzles(): Promise<Puzzle[]> {
  const rows = await sql`
    SELECT id, name, width, height, regions, solution
    FROM puzzles
    ORDER BY created_at ASC
  `;

  return rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    width: row.width as number,
    height: row.height as number,
    regions: row.regions as Puzzle["regions"],
    solution: row.solution as Puzzle["solution"],
  }));
}

export async function getPuzzleById(id: string): Promise<Puzzle | null> {
  const rows = await sql`
    SELECT id, name, width, height, regions, solution
    FROM puzzles
    WHERE id = ${id}
  `;

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    id: row.id as string,
    name: row.name as string,
    width: row.width as number,
    height: row.height as number,
    regions: row.regions as Puzzle["regions"],
    solution: row.solution as Puzzle["solution"],
  };
}

export async function getFirstPuzzle(): Promise<Puzzle | null> {
  const rows = await sql`
    SELECT id, name, width, height, regions, solution
    FROM puzzles
    ORDER BY created_at ASC
    LIMIT 1
  `;

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    id: row.id as string,
    name: row.name as string,
    width: row.width as number,
    height: row.height as number,
    regions: row.regions as Puzzle["regions"],
    solution: row.solution as Puzzle["solution"],
  };
}
