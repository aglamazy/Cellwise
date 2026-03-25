"use client";

import { useRouter } from "next/navigation";
import { PuzzleEditor } from "@/components/PuzzleEditor";
import { Puzzle } from "@/types/game";

export default function CreatePuzzlePage() {
  const router = useRouter();

  const handleSave = async (puzzle: Puzzle) => {
    const response = await fetch("/api/puzzles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(puzzle),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to save puzzle");
    }

    router.push(`/puzzle/${puzzle.id}`);
  };

  const handleCancel = () => {
    router.push("/");
  };

  return (
    <main className="min-h-screen text-white">
      <PuzzleEditor onSave={handleSave} onCancel={handleCancel} />
    </main>
  );
}
