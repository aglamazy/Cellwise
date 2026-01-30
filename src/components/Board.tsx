"use client";

import React from "react";
import { Puzzle, Position } from "@/types/game";
import {
  getRegionColorAt,
  hasQueenAt,
  isPositionInError,
  ValidationError,
} from "@/lib/game";
import { Cell } from "./Cell";

interface BoardProps {
  puzzle: Puzzle;
  queens: Position[];
  errors: ValidationError[];
  onCellClick: (position: Position) => void;
}

export function Board({ puzzle, queens, errors, onCellClick }: BoardProps) {
  const cells: React.ReactNode[] = [];

  for (let row = 0; row < puzzle.size; row++) {
    for (let col = 0; col < puzzle.size; col++) {
      const position = { row, col };
      const color = getRegionColorAt(puzzle, position);
      const hasQueen = hasQueenAt(queens, position);
      const isError = hasQueen && isPositionInError(position, errors);

      cells.push(
        <Cell
          key={`${row}-${col}`}
          color={color}
          hasQueen={hasQueen}
          isError={isError}
          onClick={() => onCellClick(position)}
        />
      );
    }
  }

  return (
    <div
      className="grid gap-0 border-2 border-gray-600 max-w-md mx-auto"
      style={{
        gridTemplateColumns: `repeat(${puzzle.size}, 1fr)`,
      }}
    >
      {cells}
    </div>
  );
}
