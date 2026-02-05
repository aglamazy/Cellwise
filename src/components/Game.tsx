"use client";

import { useState, useCallback, useMemo } from "react";
import { Puzzle, Position } from "@/types/game";
import { Board } from "./Board";
import {
  validatePlacement,
  isPuzzleSolved,
  hasCrownAt,
  hasPositionIn,
  getAutoExcludedPositions,
  ValidationError,
} from "@/lib/game";

interface GameProps {
  puzzle: Puzzle;
}

interface GameState {
  crowns: Position[];
  excluded: Position[];
}

export function Game({ puzzle }: GameProps) {
  const [crowns, setCrowns] = useState<Position[]>([]);
  const [excluded, setExcluded] = useState<Position[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [solved, setSolved] = useState(false);
  const [history, setHistory] = useState<GameState[]>([]);

  const autoExcluded = useMemo(
    () => getAutoExcludedPositions(puzzle, crowns),
    [puzzle, crowns]
  );

  const handleCellClick = useCallback(
    (position: Position) => {
      if (solved) return;

      // Save current state to history before making changes
      setHistory((prev) => [...prev, { crowns, excluded }]);

      const hasCrown = hasCrownAt(crowns, position);
      const isExcluded = hasPositionIn(excluded, position);

      if (hasCrown) {
        // Crown -> Empty: remove crown
        const newCrowns = crowns.filter(
          (c) => c.row !== position.row || c.col !== position.col
        );
        setCrowns(newCrowns);
        const newErrors = validatePlacement(puzzle, newCrowns);
        setErrors(newErrors);
      } else if (isExcluded) {
        // Excluded -> Crown: remove from excluded, add crown
        const newExcluded = excluded.filter(
          (p) => p.row !== position.row || p.col !== position.col
        );
        setExcluded(newExcluded);
        const newCrowns = [...crowns, position];
        setCrowns(newCrowns);
        const newErrors = validatePlacement(puzzle, newCrowns);
        setErrors(newErrors);

        if (isPuzzleSolved(puzzle, newCrowns)) {
          setSolved(true);
        }
      } else {
        // Empty -> Excluded: add to excluded
        setExcluded((prev) => [...prev, position]);
      }
    },
    [puzzle, crowns, excluded, solved]
  );

  const handleReset = () => {
    setCrowns([]);
    setExcluded([]);
    setErrors([]);
    setSolved(false);
    setHistory([]);
  };

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;

    const previousState = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCrowns(previousState.crowns);
    setExcluded(previousState.excluded);
    const newErrors = validatePlacement(puzzle, previousState.crowns);
    setErrors(newErrors);
    setSolved(false);
  }, [history, puzzle]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">{puzzle.name}</h1>
        <p className="text-gray-400">
          Place {puzzle.regions.length} crowns. One per row, column, and color.
        </p>
        <p className="text-gray-400">Crowns cannot touch each other.</p>
      </div>

      <Board
        puzzle={puzzle}
        crowns={crowns}
        excluded={excluded}
        autoExcluded={autoExcluded}
        errors={errors}
        onCellClick={handleCellClick}
      />

      <div className="flex gap-4 items-center">
        <span className="text-lg">
          Crowns: {crowns.length} / {puzzle.regions.length}
        </span>
        <button
          onClick={handleUndo}
          disabled={history.length === 0}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Undo
        </button>
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
