import { getPuzzles } from "@/lib/puzzles";
import Link from "next/link";
import { PuzzleList } from "@/components/PuzzleList";

export const dynamic = "force-dynamic";

export default async function Home() {
  const puzzles = await getPuzzles();

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Cellwise</h1>

        <PuzzleList initialPuzzles={puzzles} />

        <Link
          href="/create"
          className="block w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-center font-medium transition-colors"
        >
          + Create New Puzzle
        </Link>
      </div>
    </main>
  );
}
