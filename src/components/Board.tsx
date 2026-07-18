"use client";

import React, { useRef, useCallback, useEffect } from "react";
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
  onSwipeCells?: (positions: Position[]) => void;
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
  onSwipeCells,
}: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const swipedCellsRef = useRef<Position[]>([]);
  const isSwiping = useRef(false);

  // Get cell position from touch/mouse coordinates
  const getCellFromPoint = useCallback(
    (clientX: number, clientY: number): Position | null => {
      const board = boardRef.current;
      if (!board) return null;

      const rect = board.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;

      const col = Math.floor((x / rect.width) * puzzle.width);
      const row = Math.floor((y / rect.height) * puzzle.height);

      if (row < 0 || row >= puzzle.height || col < 0 || col >= puzzle.width)
        return null;

      return { row, col };
    },
    [puzzle.width, puzzle.height]
  );

  const addSwipedCell = useCallback((pos: Position) => {
    const already = swipedCellsRef.current.some(
      (p) => p.row === pos.row && p.col === pos.col
    );
    if (!already) {
      swipedCellsRef.current = [...swipedCellsRef.current, pos];
    }
  }, []);

  // Touch event handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      const pos = getCellFromPoint(
        e.touches[0].clientX,
        e.touches[0].clientY
      );
      if (pos) {
        isSwiping.current = true;
        swipedCellsRef.current = [pos];
      }
    },
    [getCellFromPoint]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isSwiping.current) return;
      // Prevent pull-to-refresh and scrolling while swiping on the board
      e.preventDefault();
      const pos = getCellFromPoint(
        e.touches[0].clientX,
        e.touches[0].clientY
      );
      if (pos) {
        addSwipedCell(pos);
      }
    },
    [getCellFromPoint, addSwipedCell]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping.current) return;
    isSwiping.current = false;

    const swiped = swipedCellsRef.current;
    if (swiped.length <= 1) {
      // Single tap — let onClick handle it
      swipedCellsRef.current = [];
      return;
    }

    // Multi-cell swipe
    if (onSwipeCells) {
      onSwipeCells(swiped);
    }
    swipedCellsRef.current = [];
  }, [onSwipeCells]);

  // Mouse event handlers for desktop drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = getCellFromPoint(e.clientX, e.clientY);
      if (pos) {
        isSwiping.current = true;
        swipedCellsRef.current = [pos];
      }
    },
    [getCellFromPoint]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isSwiping.current) return;
      const pos = getCellFromPoint(e.clientX, e.clientY);
      if (pos) {
        addSwipedCell(pos);
      }
    },
    [getCellFromPoint, addSwipedCell]
  );

  const handleMouseUp = useCallback(() => {
    if (!isSwiping.current) return;
    isSwiping.current = false;

    const swiped = swipedCellsRef.current;
    if (swiped.length <= 1) {
      swipedCellsRef.current = [];
      return;
    }

    if (onSwipeCells) {
      onSwipeCells(swiped);
    }
    swipedCellsRef.current = [];
  }, [onSwipeCells]);

  // Cancel swipe if mouse leaves the board
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSwiping.current) {
        isSwiping.current = false;
        const swiped = swipedCellsRef.current;
        if (swiped.length > 1 && onSwipeCells) {
          onSwipeCells(swiped);
        }
        swipedCellsRef.current = [];
      }
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [onSwipeCells]);

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
      ref={boardRef}
      className="grid gap-0 border-2 border-gray-600/60 w-full max-w-md aspect-square rounded-lg overflow-hidden shadow-lg shadow-black/30 touch-none select-none"
      style={{
        gridTemplateColumns: `repeat(${puzzle.width}, 1fr)`,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {cells}
    </div>
  );
}
