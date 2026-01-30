import { Position, Puzzle } from "@/types/game";

export function areAdjacent(pos1: Position, pos2: Position): boolean {
  const rowDiff = Math.abs(pos1.row - pos2.row);
  const colDiff = Math.abs(pos1.col - pos2.col);
  return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
}

export function getRegionIdAt(puzzle: Puzzle, position: Position): number {
  for (const region of puzzle.regions) {
    for (const cell of region.cells) {
      if (cell.row === position.row && cell.col === position.col) {
        return region.id;
      }
    }
  }
  return -1;
}

export function getRegionColorAt(puzzle: Puzzle, position: Position): string {
  for (const region of puzzle.regions) {
    for (const cell of region.cells) {
      if (cell.row === position.row && cell.col === position.col) {
        return region.color;
      }
    }
  }
  return "#gray";
}

export interface ValidationError {
  type: "row" | "column" | "region" | "adjacent";
  positions: Position[];
}

export function validatePlacement(
  puzzle: Puzzle,
  queens: Position[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check row conflicts
  const rowCounts = new Map<number, Position[]>();
  for (const queen of queens) {
    const existing = rowCounts.get(queen.row) || [];
    existing.push(queen);
    rowCounts.set(queen.row, existing);
  }
  for (const [, positions] of rowCounts) {
    if (positions.length > 1) {
      errors.push({ type: "row", positions });
    }
  }

  // Check column conflicts
  const colCounts = new Map<number, Position[]>();
  for (const queen of queens) {
    const existing = colCounts.get(queen.col) || [];
    existing.push(queen);
    colCounts.set(queen.col, existing);
  }
  for (const [, positions] of colCounts) {
    if (positions.length > 1) {
      errors.push({ type: "column", positions });
    }
  }

  // Check region conflicts
  const regionCounts = new Map<number, Position[]>();
  for (const queen of queens) {
    const regionId = getRegionIdAt(puzzle, queen);
    const existing = regionCounts.get(regionId) || [];
    existing.push(queen);
    regionCounts.set(regionId, existing);
  }
  for (const [, positions] of regionCounts) {
    if (positions.length > 1) {
      errors.push({ type: "region", positions });
    }
  }

  // Check adjacency conflicts
  for (let i = 0; i < queens.length; i++) {
    for (let j = i + 1; j < queens.length; j++) {
      if (areAdjacent(queens[i], queens[j])) {
        errors.push({ type: "adjacent", positions: [queens[i], queens[j]] });
      }
    }
  }

  return errors;
}

export function isPositionInError(
  position: Position,
  errors: ValidationError[]
): boolean {
  for (const error of errors) {
    for (const pos of error.positions) {
      if (pos.row === position.row && pos.col === position.col) {
        return true;
      }
    }
  }
  return false;
}

export function isPuzzleSolved(puzzle: Puzzle, queens: Position[]): boolean {
  if (queens.length !== puzzle.size) {
    return false;
  }
  const errors = validatePlacement(puzzle, queens);
  return errors.length === 0;
}

export function hasQueenAt(queens: Position[], position: Position): boolean {
  return queens.some((q) => q.row === position.row && q.col === position.col);
}
