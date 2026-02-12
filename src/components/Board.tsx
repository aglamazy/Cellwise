"use client";

import React from "react";
import { Puzzle, Position } from "@/types/game";
import {
  getRegionColorAt,
  hasCrownAt,
  hasPositionIn,
  isPositionInError,
  ValidationError,
  AutoExclusion,
} from "@/lib/game";
import { Cell, CellState } from "./Cell";

interface BoardProps {
  puzzle: Puzzle;
  crowns: Position[];
  excluded: Position[];
  autoExcluded: Position[];
  autoExclusions: AutoExclusion[];
  errors: ValidationError[];
  hintedCell: Position | null;
  hintType: "error" | "cant_be" | "must_be" | null;
  onCellClick: (position: Position) => void;
}

export function Board({
  puzzle,
  crowns,
  excluded,
  autoExcluded,
  autoExclusions,
  errors,
  hintedCell,
  hintType,
  onCellClick,
}: BoardProps) {
  const cells: React.ReactNode[] = [];

  // Build a map from position key to reason for quick lookup
  const reasonMap = new Map<string, string>();
  for (const exclusion of autoExclusions) {
    reasonMap.set(`${exclusion.position.row}-${exclusion.position.col}`, exclusion.reason);
  }

  for (let row = 0; row < puzzle.height; row++) {
    for (let col = 0; col < puzzle.width; col++) {
      const position = { row, col };
      const color = getRegionColorAt(puzzle, position);
      const hasCrown = hasCrownAt(crowns, position);
      const isExcluded = hasPositionIn(excluded, position);
      const isAutoExcluded = hasPositionIn(autoExcluded, position);
      const isError = hasCrown && isPositionInError(position, errors);
      const isHinted = hintedCell !== null && hintedCell.row === row && hintedCell.col === col;
      const autoExcludeReason = reasonMap.get(`${row}-${col}`) || null;

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
          isHinted={isHinted}
          hintType={isHinted ? hintType : null}
          autoExcludeReason={autoExcludeReason}
          onClick={() => onCellClick(position)}
        />
      );
    }
  }

  return (
    <div
      className="grid gap-0 border-2 border-gray-600 w-full max-w-md aspect-square"
      style={{
        gridTemplateColumns: `repeat(${puzzle.width}, 1fr)`,
      }}
    >
      {cells}
    </div>
  );
}
