import {
  getSessionFromCookie,
  logoutUser,
  deleteSessionCookie,
} from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const sessionId = await getSessionFromCookie();

    if (sessionId) {
      await logoutUser(sessionId);
    }

    await deleteSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
