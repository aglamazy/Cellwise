import { getPuzzles } from "@/lib/puzzles";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  const puzzles = await getPuzzles();

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Cellwise</h1>

        <div className="flex flex-col gap-3 mb-6">
          {puzzles.map((puzzle) => (
            <Link
              key={puzzle.id}
              href={`/puzzle/${puzzle.id}`}
              className="block p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">{puzzle.name}</span>
                <span className="text-gray-400 text-sm">
                  {puzzle.width}x{puzzle.height} &middot; {puzzle.regions.length} crowns
                </span>
              </div>
            </Link>
          ))}

          {puzzles.length === 0 && (
            <p className="text-gray-400 text-center py-8">No puzzles yet</p>
          )}
        </div>

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
