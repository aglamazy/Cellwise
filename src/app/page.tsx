import { getPuzzles } from "@/lib/puzzles";
import Link from "next/link";
import { PuzzleList } from "@/components/PuzzleList";
import { PlayButton } from "@/components/PlayButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  const puzzles = await getPuzzles();

  return (
    <main className="px-4 pb-8 sm:px-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <p className="text-gray-400 text-lg mb-1">
            A logic puzzle — place one crown per row, column, and color.
          </p>
          <p className="text-gray-500 text-sm mb-5">
            No guessing needed. Every puzzle is solvable by deduction alone.
          </p>
          <PlayButton puzzles={puzzles} />
        </div>

        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
          All Puzzles
        </h2>

        <PuzzleList initialPuzzles={puzzles} />

        <Link
          href="/create"
          className="block w-full py-3 bg-blue-600/90 hover:bg-blue-500 rounded-lg text-center font-medium transition-all text-sm"
        >
          + Create New Puzzle
        </Link>
      </div>
    </main>
  );
}
