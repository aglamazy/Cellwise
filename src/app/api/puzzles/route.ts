import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const puzzle = await request.json();

    // Validate required fields
    if (!puzzle.id || !puzzle.name || !puzzle.width || !puzzle.height || !puzzle.regions || !puzzle.solution) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate puzzle has correct number of regions
    if (puzzle.regions.length === 0) {
      return NextResponse.json({ error: "Puzzle must have at least one region" }, { status: 400 });
    }

    // Validate solution count matches regions
    if (puzzle.solution.length !== puzzle.regions.length) {
      return NextResponse.json({ error: "Solution must have one crown per region" }, { status: 400 });
    }

    // Check for unique puzzle name
    const existingPuzzle = await sql`
      SELECT id FROM puzzles WHERE LOWER(name) = LOWER(${puzzle.name}) AND id != ${puzzle.id}
    `;
    if (existingPuzzle.length > 0) {
      return NextResponse.json({ error: "A puzzle with this name already exists" }, { status: 400 });
    }

    await sql`
      INSERT INTO puzzles (id, name, width, height, regions, solution)
      VALUES (
        ${puzzle.id},
        ${puzzle.name},
        ${puzzle.width},
        ${puzzle.height},
        ${JSON.stringify(puzzle.regions)},
        ${JSON.stringify(puzzle.solution)}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        width = EXCLUDED.width,
        height = EXCLUDED.height,
        regions = EXCLUDED.regions,
        solution = EXCLUDED.solution
    `;

    return NextResponse.json({ success: true, id: puzzle.id });
  } catch (error) {
    console.error("Error saving puzzle:", error);
    return NextResponse.json({ error: "Failed to save puzzle" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const rows = await sql`
      SELECT id, name, width, height, regions, solution
      FROM puzzles
      ORDER BY created_at ASC
    `;

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching puzzles:", error);
    return NextResponse.json({ error: "Failed to fetch puzzles" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing puzzle id" }, { status: 400 });
    }

    const result = await sql`
      DELETE FROM puzzles WHERE id = ${id} RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Error deleting puzzle:", error);
    return NextResponse.json({ error: "Failed to delete puzzle" }, { status: 500 });
  }
}
