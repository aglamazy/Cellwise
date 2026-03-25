"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { PuzzleEditor } from "@/components/PuzzleEditor";
import { useAuth } from "@/contexts/AuthContext";
import { Puzzle } from "@/types/game";

export default function EditPuzzlePage() {
  const router = useRouter();
  const params = useParams();
  const puzzleId = params.id as string;
  const { user, isLoading: authLoading } = useAuth();

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPuzzle() {
      try {
        const response = await fetch("/api/puzzles");
        const puzzles = await response.json();

        if (!Array.isArray(puzzles)) {
          setError("Failed to load puzzles");
          return;
        }

        const found = puzzles.find((p: Puzzle) => p.id === puzzleId);
        if (!found) {
          setError("Puzzle not found");
          return;
        }

        setPuzzle(found);
      } catch {
        setError("Failed to load puzzle");
      } finally {
        setLoading(false);
      }
    }

    loadPuzzle();
  }, [puzzleId]);

  // Check authorization
  useEffect(() => {
    if (!authLoading && !loading && puzzle) {
      // Allow if user is the owner or is admin
      if (puzzle.userId && user?.id !== puzzle.userId && user?.role !== "admin") {
        setError("You can only edit your own puzzles");
      }
    }
  }, [authLoading, loading, puzzle, user]);

  const handleSave = async (updatedPuzzle: Puzzle) => {
    const response = await fetch("/api/puzzles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedPuzzle),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to save puzzle");
    }

    router.push(`/puzzle/${updatedPuzzle.id}`);
  };

  const handleCancel = () => {
    router.push("/my-puzzles");
  };

  if (loading || authLoading) {
    return (
      <main className="min-h-screen text-white flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen text-white flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        >
          Go Home
        </button>
      </main>
    );
  }

  if (!puzzle) {
    return (
      <main className="min-h-screen text-white flex items-center justify-center">
        <p className="text-gray-400">Puzzle not found</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-white">
      <PuzzleEditor
        onSave={handleSave}
        onCancel={handleCancel}
        initialPuzzle={puzzle}
      />
    </main>
  );
}
