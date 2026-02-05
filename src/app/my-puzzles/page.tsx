"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { Puzzle } from "@/types/game";

export default function MyPuzzlesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      fetch("/api/puzzles")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setPuzzles(data.filter((p: Puzzle) => p.userId === user.id));
          }
        })
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleDelete = async (puzzleId: string, puzzleName: string) => {
    if (!confirm(`Delete "${puzzleName}"? This cannot be undone.`)) {
      return;
    }

    setDeleteError(null);

    try {
      const response = await fetch(`/api/puzzles?id=${puzzleId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setDeleteError(data.error || "Failed to delete puzzle");
        return;
      }

      setPuzzles((prev) => prev.filter((p) => p.id !== puzzleId));
    } catch {
      setDeleteError("Failed to delete puzzle");
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
        <div className="max-w-2xl mx-auto">
          <Header title="My Puzzles" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <Header title="My Puzzles" />

        <div className="mb-6">
          <Link
            href="/create"
            className="inline-block px-4 py-2 bg-green-600 hover:bg-green-500 rounded transition-colors"
          >
            Create New Puzzle
          </Link>
        </div>

        {deleteError && (
          <div className="mb-4 bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded">
            {deleteError}
          </div>
        )}

        {puzzles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">
              You haven&apos;t created any puzzles yet.
            </p>
            <Link
              href="/create"
              className="text-blue-400 hover:underline"
            >
              Create your first puzzle
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {puzzles.map((puzzle) => (
              <div
                key={puzzle.id}
                className="bg-gray-800 rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-medium">{puzzle.name}</h3>
                  <p className="text-gray-400 text-sm">
                    {puzzle.width}x{puzzle.height} - {puzzle.regions.length}{" "}
                    regions
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/puzzle/${puzzle.id}`}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm transition-colors"
                  >
                    Play
                  </Link>
                  <Link
                    href={`/edit/${puzzle.id}`}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(puzzle.id, puzzle.name)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-sm transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
