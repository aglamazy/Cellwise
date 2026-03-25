import { Game } from "@/components/Game";
import { getPuzzleById } from "@/lib/puzzles";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PuzzlePage({ params }: Props) {
  const { id } = await params;
  const puzzle = await getPuzzleById(id);

  if (!puzzle) {
    notFound();
  }

  return (
    <main className="min-h-screen text-white p-4 sm:p-8">
      <div className="max-w-lg mx-auto">
        <Link
          href="/"
          className="inline-block mb-4 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          &larr; Back to puzzles
        </Link>
        <Game puzzle={puzzle} />
      </div>
    </main>
  );
}
