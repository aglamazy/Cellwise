import { Game } from "@/components/Game";
import { PUZZLE_1 } from "@/data/puzzles";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <Game puzzle={PUZZLE_1} />
    </main>
  );
}
