import { sql } from "./db";
import { Puzzle } from "@/types/game";

function mapRowToPuzzle(row: Record<string, unknown>): Puzzle {
  return {
    id: row.id as string,
    name: row.name as string,
    width: row.width as number,
    height: row.height as number,
    regions: row.regions as Puzzle["regions"],
    solution: row.solution as Puzzle["solution"],
    userId: row.user_id as string | undefined,
    creatorName: row.creator_name as string | undefined,
  };
}

export async function getPuzzles(): Promise<Puzzle[]> {
  const rows = await sql`
    SELECT p.id, p.name, p.width, p.height, p.regions, p.solution, p.user_id,
           u.name as creator_name
    FROM puzzles p
    LEFT JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at ASC
  `;

  return rows.map(mapRowToPuzzle);
}

export async function getPuzzleById(id: string): Promise<Puzzle | null> {
  const rows = await sql`
    SELECT p.id, p.name, p.width, p.height, p.regions, p.solution, p.user_id,
           u.name as creator_name
    FROM puzzles p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.id = ${id}
  `;

  if (rows.length === 0) {
    return null;
  }

  return mapRowToPuzzle(rows[0]);
}

export async function getPuzzlesByUser(userId: string): Promise<Puzzle[]> {
  const rows = await sql`
    SELECT p.id, p.name, p.width, p.height, p.regions, p.solution, p.user_id,
           u.name as creator_name
    FROM puzzles p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.user_id = ${userId}
    ORDER BY p.created_at DESC
  `;

  return rows.map(mapRowToPuzzle);
}

export async function getFirstPuzzle(): Promise<Puzzle | null> {
  const rows = await sql`
    SELECT p.id, p.name, p.width, p.height, p.regions, p.solution, p.user_id,
           u.name as creator_name
    FROM puzzles p
    LEFT JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at ASC
    LIMIT 1
  `;

  if (rows.length === 0) {
    return null;
  }

  return mapRowToPuzzle(rows[0]);
}
