import { Game } from "@/components/Game";
import { getPuzzleById } from "@/lib/puzzles";
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
    <main className="px-4 pb-8 sm:px-8">
      <div className="max-w-lg mx-auto">
        <Game puzzle={puzzle} />
      </div>
    </main>
  );
}
