"use client";

import React from "react";
import { Puzzle, Position } from "@/types/game";
import {
  getRegionColorAt,
  hasCrownAt,
  hasPositionIn,
  isPositionInError,
  ValidationError,
} from "@/lib/game";
import { Cell, CellState } from "./Cell";

interface BoardProps {
  puzzle: Puzzle;
  crowns: Position[];
  excluded: Position[];
  autoExcluded: Position[];
  errors: ValidationError[];
  onCellClick: (position: Position) => void;
}

export function Board({
  puzzle,
  crowns,
  excluded,
  autoExcluded,
  errors,
  onCellClick,
}: BoardProps) {
  const cells: React.ReactNode[] = [];

  for (let row = 0; row < puzzle.size; row++) {
    for (let col = 0; col < puzzle.size; col++) {
      const position = { row, col };
      const color = getRegionColorAt(puzzle, position);
      const hasCrown = hasCrownAt(crowns, position);
      const isExcluded = hasPositionIn(excluded, position);
      const isAutoExcluded = hasPositionIn(autoExcluded, position);
      const isError = hasCrown && isPositionInError(position, errors);

      let state: CellState = "empty";
      if (hasCrown) {
        state = "crown";
      } else if (isExcluded) {
        state = "excluded";
      }

      cells.push(
        <Cell
          key={`${row}-${col}`}
          color={color}
          state={state}
          isAutoExcluded={isAutoExcluded}
          isError={isError}
          onClick={() => onCellClick(position)}
        />
      );
    }
  }

  return (
    <div
      className="grid gap-0 border-2 border-gray-600 w-80"
      style={{
        gridTemplateColumns: `repeat(${puzzle.size}, 1fr)`,
      }}
    >
      {cells}
    </div>
  );
}
