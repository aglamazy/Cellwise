import { runMigrations } from "@/lib/migrations";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

// Schema changes are an admin action. This route used to be an open POST that
// any visitor could fire; the statements are idempotent, so the blast radius was
// small, but an unauthenticated endpoint that writes DDL has no business being
// public. Bootstrapping a fresh database (no admin exists yet) is done with
// `npm run db:migrate`, which runs the same function locally.
export async function POST() {
  const user = await getCurrentUser();

  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    await runMigrations();
    return NextResponse.json({ success: true, message: "Migrations completed" });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "Migration failed", details: String(error) },
      { status: 500 }
    );
  }
}
