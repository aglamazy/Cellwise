"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  getCompletedPuzzlesSnapshot,
  getCompletedPuzzlesServerSnapshot,
  subscribeToCompletedPuzzles,
} from "@/lib/puzzleHistory";
import { Puzzle } from "@/types/game";

/**
 * Opens the first puzzle the player hasn't solved yet.
 *
 * This used to link at puzzles[0], and getPuzzles() sorts oldest-first — so the
 * most prominent button on the site replayed "Starter" forever, no matter how
 * many puzzles you'd finished. Completion lives in localStorage, hence a client
 * component: the server renders the first puzzle and hydration corrects it.
 */
export function PlayButton({ puzzles }: { puzzles: Puzzle[] }) {
  const completedIds = useSyncExternalStore(
    subscribeToCompletedPuzzles,
    getCompletedPuzzlesSnapshot,
    getCompletedPuzzlesServerSnapshot
  );

  if (puzzles.length === 0) return null;

  const nextUnsolved = puzzles.find((p) => !completedIds.includes(p.id));
  const target = nextUnsolved ?? puzzles[0];

  const label = nextUnsolved
    ? completedIds.length > 0
      ? "Continue"
      : "Play"
    : "Play again";

  return (
    <Link
      href={`/puzzle/${target.id}`}
      className="inline-block px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-lg font-medium transition-all text-base"
    >
      {label}
    </Link>
  );
}
