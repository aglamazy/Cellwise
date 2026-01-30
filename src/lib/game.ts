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
  crowns: Position[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check row conflicts
  const rowCounts = new Map<number, Position[]>();
  for (const crown of crowns) {
    const existing = rowCounts.get(crown.row) || [];
    existing.push(crown);
    rowCounts.set(crown.row, existing);
  }
  for (const [, positions] of rowCounts) {
    if (positions.length > 1) {
      errors.push({ type: "row", positions });
    }
  }

  // Check column conflicts
  const colCounts = new Map<number, Position[]>();
  for (const crown of crowns) {
    const existing = colCounts.get(crown.col) || [];
    existing.push(crown);
    colCounts.set(crown.col, existing);
  }
  for (const [, positions] of colCounts) {
    if (positions.length > 1) {
      errors.push({ type: "column", positions });
    }
  }

  // Check region conflicts
  const regionCounts = new Map<number, Position[]>();
  for (const crown of crowns) {
    const regionId = getRegionIdAt(puzzle, crown);
    const existing = regionCounts.get(regionId) || [];
    existing.push(crown);
    regionCounts.set(regionId, existing);
  }
  for (const [, positions] of regionCounts) {
    if (positions.length > 1) {
      errors.push({ type: "region", positions });
    }
  }

  // Check adjacency conflicts
  for (let i = 0; i < crowns.length; i++) {
    for (let j = i + 1; j < crowns.length; j++) {
      if (areAdjacent(crowns[i], crowns[j])) {
        errors.push({ type: "adjacent", positions: [crowns[i], crowns[j]] });
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

export function isPuzzleSolved(puzzle: Puzzle, crowns: Position[]): boolean {
  // Need one crown per region
  if (crowns.length !== puzzle.regions.length) {
    return false;
  }
  const errors = validatePlacement(puzzle, crowns);
  return errors.length === 0;
}

export function hasCrownAt(crowns: Position[], position: Position): boolean {
  return crowns.some((c) => c.row === position.row && c.col === position.col);
}

export function hasPositionIn(positions: Position[], position: Position): boolean {
  return positions.some((p) => p.row === position.row && p.col === position.col);
}

export function getAutoExcludedPositions(
  puzzle: Puzzle,
  crowns: Position[]
): Position[] {
  const excluded: Position[] = [];
  const seen = new Set<string>();

  for (const crown of crowns) {
    const crownRegionId = getRegionIdAt(puzzle, crown);

    // Exclude all cells in same row, column, or region
    for (let row = 0; row < puzzle.height; row++) {
      for (let col = 0; col < puzzle.width; col++) {
        const pos = { row, col };
        const key = `${row}-${col}`;

        // Skip if already seen or is a crown position
        if (seen.has(key) || hasCrownAt(crowns, pos)) {
          continue;
        }

        const posRegionId = getRegionIdAt(puzzle, pos);
        const sameRow = row === crown.row;
        const sameCol = col === crown.col;
        const sameRegion = posRegionId === crownRegionId;
        const isAdjacent = areAdjacent(crown, pos);

        if (sameRow || sameCol || sameRegion || isAdjacent) {
          excluded.push(pos);
          seen.add(key);
        }
      }
    }
  }

  return excluded;
}
