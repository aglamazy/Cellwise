"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Puzzle } from "@/types/game";
import { useAuth } from "@/contexts/AuthContext";

interface PuzzleListProps {
  initialPuzzles: Puzzle[];
}

export function PuzzleList({ initialPuzzles }: PuzzleListProps) {
  const [puzzles, setPuzzles] = useState(initialPuzzles);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();
  const { isAdmin } = useAuth();

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this puzzle?")) {
      return;
    }

    setDeleting(id);
    try {
      const res = await fetch(`/api/puzzles?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPuzzles((prev) => prev.filter((p) => p.id !== id));
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete puzzle");
      }
    } catch (error) {
      console.error("Error deleting puzzle:", error);
      alert("Failed to delete puzzle");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 mb-6">
      {puzzles.map((puzzle) => (
        <div
          key={puzzle.id}
          className="flex items-center gap-2"
        >
          <Link
            href={`/puzzle/${puzzle.id}`}
            className="flex-1 block p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
              <span className="font-medium">{puzzle.name}</span>
              <span className="text-gray-400 text-sm">
                {puzzle.width}x{puzzle.height} &middot; {puzzle.regions.length} crowns
              </span>
            </div>
          </Link>
          {isAdmin && (
            <button
              onClick={(e) => handleDelete(puzzle.id, e)}
              disabled={deleting === puzzle.id}
              className="p-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 rounded-lg transition-colors"
              title="Delete puzzle"
            >
              {deleting === puzzle.id ? (
                <span className="block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              )}
            </button>
          )}
        </div>
      ))}

      {puzzles.length === 0 && (
        <p className="text-gray-400 text-center py-8">No puzzles yet</p>
      )}
    </div>
  );
}
