import { getPuzzles } from "@/lib/puzzles";
import Link from "next/link";
import { PuzzleList } from "@/components/PuzzleList";
import { Header } from "@/components/Header";

export const dynamic = "force-dynamic";

export default async function Home() {
  const puzzles = await getPuzzles();

  return (
    <main className="min-h-screen text-white p-4 sm:p-8">
      <div className="max-w-lg mx-auto">
        <Header title="CellWise" />

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
