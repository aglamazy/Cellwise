import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to save results" },
        { status: 401 }
      );
    }

    const { puzzleId, timeSeconds } = await request.json();

    if (!puzzleId || typeof timeSeconds !== "number") {
      return NextResponse.json(
        { error: "Missing puzzleId or timeSeconds" },
        { status: 400 }
      );
    }

    // Check if result already exists for this user and puzzle
    const existing = await sql`
      SELECT id, time_seconds FROM game_results
      WHERE puzzle_id = ${puzzleId} AND user_id = ${user.id}
    `;

    const resultId = `result-${Date.now()}`;

    if (existing.length > 0) {
      // Only update if new time is better (lower)
      const existingTime = existing[0].time_seconds as number;
      if (timeSeconds < existingTime) {
        await sql`
          UPDATE game_results SET
            time_seconds = ${timeSeconds},
            completed_at = NOW()
          WHERE puzzle_id = ${puzzleId} AND user_id = ${user.id}
        `;
        return NextResponse.json({
          success: true,
          improved: true,
          previousTime: existingTime,
          newTime: timeSeconds,
        });
      }
      return NextResponse.json({
        success: true,
        improved: false,
        bestTime: existingTime,
      });
    }

    // Insert new result
    await sql`
      INSERT INTO game_results (id, puzzle_id, user_id, time_seconds)
      VALUES (${resultId}, ${puzzleId}, ${user.id}, ${timeSeconds})
    `;

    return NextResponse.json({ success: true, isNewRecord: true });
  } catch (error) {
    console.error("Error saving result:", error);
    return NextResponse.json(
      { error: "Failed to save result" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const puzzleId = searchParams.get("puzzleId");
    const userId = searchParams.get("userId");

    if (puzzleId) {
      // Get leaderboard for a specific puzzle
      const rows = await sql`
        SELECT gr.time_seconds, gr.completed_at, u.name as user_name, u.id as user_id
        FROM game_results gr
        JOIN users u ON gr.user_id = u.id
        WHERE gr.puzzle_id = ${puzzleId}
        ORDER BY gr.time_seconds ASC
        LIMIT 10
      `;

      return NextResponse.json(
        rows.map((row) => ({
          timeSeconds: row.time_seconds,
          completedAt: row.completed_at,
          userName: row.user_name,
          userId: row.user_id,
        }))
      );
    }

    if (userId) {
      // Get results for a specific user
      const rows = await sql`
        SELECT gr.time_seconds, gr.completed_at, gr.puzzle_id, p.name as puzzle_name
        FROM game_results gr
        JOIN puzzles p ON gr.puzzle_id = p.id
        WHERE gr.user_id = ${userId}
        ORDER BY gr.completed_at DESC
      `;

      return NextResponse.json(
        rows.map((row) => ({
          timeSeconds: row.time_seconds,
          completedAt: row.completed_at,
          puzzleId: row.puzzle_id,
          puzzleName: row.puzzle_name,
        }))
      );
    }

    return NextResponse.json({ error: "Missing puzzleId or userId" }, { status: 400 });
  } catch (error) {
    console.error("Error fetching results:", error);
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 }
    );
  }
}
