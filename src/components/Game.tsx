"use client";

import { useState, useCallback } from "react";
import { Puzzle, Position } from "@/types/game";
import { Board } from "./Board";
import {
  validatePlacement,
  isPuzzleSolved,
  hasQueenAt,
  ValidationError,
} from "@/lib/game";

interface GameProps {
  puzzle: Puzzle;
}

export function Game({ puzzle }: GameProps) {
  const [queens, setQueens] = useState<Position[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [solved, setSolved] = useState(false);

  const handleCellClick = useCallback(
    (position: Position) => {
      if (solved) return;

      setQueens((prev) => {
        let newQueens: Position[];

        if (hasQueenAt(prev, position)) {
          // Remove queen
          newQueens = prev.filter(
            (q) => q.row !== position.row || q.col !== position.col
          );
        } else {
          // Add queen
          newQueens = [...prev, position];
        }

        // Validate
        const newErrors = validatePlacement(puzzle, newQueens);
        setErrors(newErrors);

        // Check win
        if (isPuzzleSolved(puzzle, newQueens)) {
          setSolved(true);
        }

        return newQueens;
      });
    },
    [puzzle, solved]
  );

  const handleReset = () => {
    setQueens([]);
    setErrors([]);
    setSolved(false);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">{puzzle.name}</h1>
        <p className="text-gray-400">
          Place {puzzle.size} queens. One per row, column, and color.
        </p>
        <p className="text-gray-400">Queens cannot touch each other.</p>
      </div>

      <Board
        puzzle={puzzle}
        queens={queens}
        errors={errors}
        onCellClick={handleCellClick}
      />

      <div className="flex gap-4 items-center">
        <span className="text-lg">
          Queens: {queens.length} / {puzzle.size}
        </span>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        >
          Reset
        </button>
      </div>

      {errors.length > 0 && !solved && (
        <div className="text-red-400">
          {errors.length} conflict{errors.length > 1 ? "s" : ""} detected
        </div>
      )}

      {solved && (
        <div className="text-green-400 text-2xl font-bold animate-pulse">
          Solved!
        </div>
      )}
    </div>
  );
}
