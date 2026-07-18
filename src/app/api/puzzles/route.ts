import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { User } from "@/types/user";
import { NextRequest, NextResponse } from "next/server";

// Who may edit or delete an existing puzzle.
//
// The previous check read `if (ownerId && user?.id !== ownerId && ...)`, which
// short-circuits to "allowed" whenever ownerId is null — and every puzzle
// created before accounts existed has a null owner. That let anyone, logged out,
// delete or overwrite them. Ownerless puzzles are now admin-only.
function canModify(user: User | null, ownerId: string | null): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return ownerId !== null && ownerId === user.id;
}

export async function POST(request: NextRequest) {
  try {
    const puzzle = await request.json();
    const user = await getCurrentUser();

    // Validate required fields
    if (
      !puzzle.id ||
      !puzzle.name ||
      !puzzle.width ||
      !puzzle.height ||
      !puzzle.regions ||
      !puzzle.solution
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate puzzle has correct number of regions
    if (puzzle.regions.length === 0) {
      return NextResponse.json(
        { error: "Puzzle must have at least one region" },
        { status: 400 }
      );
    }

    // Validate solution count matches regions
    if (puzzle.solution.length !== puzzle.regions.length) {
      return NextResponse.json(
        { error: "Solution must have one crown per region" },
        { status: 400 }
      );
    }

    // Check for unique puzzle name
    const existingPuzzle = await sql`
      SELECT id, user_id FROM puzzles WHERE LOWER(name) = LOWER(${puzzle.name}) AND id != ${puzzle.id}
    `;
    if (existingPuzzle.length > 0) {
      return NextResponse.json(
        { error: "A puzzle with this name already exists" },
        { status: 400 }
      );
    }

    // Check if this is an update (puzzle already exists)
    const existingById = await sql`
      SELECT id, user_id FROM puzzles WHERE id = ${puzzle.id}
    `;

    if (existingById.length > 0) {
      // This is an update - check if user owns this puzzle or is admin
      const puzzleOwnerId = existingById[0].user_id;
      if (!canModify(user, puzzleOwnerId as string | null)) {
        return NextResponse.json(
          { error: "You can only edit your own puzzles" },
          { status: 403 }
        );
      }

      // Update existing puzzle
      await sql`
        UPDATE puzzles SET
          name = ${puzzle.name},
          width = ${puzzle.width},
          height = ${puzzle.height},
          regions = ${JSON.stringify(puzzle.regions)},
          solution = ${JSON.stringify(puzzle.solution)}
        WHERE id = ${puzzle.id}
      `;
    } else {
      // Create new puzzle with user_id
      await sql`
        INSERT INTO puzzles (id, name, width, height, regions, solution, user_id)
        VALUES (
          ${puzzle.id},
          ${puzzle.name},
          ${puzzle.width},
          ${puzzle.height},
          ${JSON.stringify(puzzle.regions)},
          ${JSON.stringify(puzzle.solution)},
          ${user?.id || null}
        )
      `;
    }

    return NextResponse.json({ success: true, id: puzzle.id });
  } catch (error) {
    console.error("Error saving puzzle:", error);
    return NextResponse.json(
      { error: "Failed to save puzzle" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const rows = await sql`
      SELECT p.id, p.name, p.width, p.height, p.regions, p.solution, p.user_id,
             u.name as creator_name
      FROM puzzles p
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at ASC
    `;

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        width: row.width,
        height: row.height,
        regions: row.regions,
        solution: row.solution,
        userId: row.user_id,
        creatorName: row.creator_name,
      }))
    );
  } catch (error) {
    console.error("Error fetching puzzles:", error);
    return NextResponse.json(
      { error: "Failed to fetch puzzles" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const user = await getCurrentUser();

    if (!id) {
      return NextResponse.json({ error: "Missing puzzle id" }, { status: 400 });
    }

    // Check if puzzle exists and get owner
    const existing = await sql`
      SELECT id, user_id FROM puzzles WHERE id = ${id}
    `;

    if (existing.length === 0) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    const puzzleOwnerId = existing[0].user_id;

    // Allow delete only if user owns the puzzle or is admin
    if (!canModify(user, puzzleOwnerId as string | null)) {
      return NextResponse.json(
        { error: "You can only delete your own puzzles" },
        { status: 403 }
      );
    }

    await sql`DELETE FROM puzzles WHERE id = ${id}`;

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Error deleting puzzle:", error);
    return NextResponse.json(
      { error: "Failed to delete puzzle" },
      { status: 500 }
    );
  }
}
