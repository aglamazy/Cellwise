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

/**
 * Calculate the number of valid solutions for a square puzzle
 * Uses backtracking to count all valid crown placements
 * @param puzzle - The puzzle (must be square, size 5-10)
 * @returns The number of valid solutions
 */
export function calculatePuzzleNumber(puzzle: Puzzle): number {
  const size = puzzle.width;

  // Validate square grid and size range
  if (puzzle.width !== puzzle.height) return 0;
  if (size < 5 || size > 10) return 0;

  let solutionCount = 0;
  const crowns: Position[] = [];
  const usedCols = new Set<number>();
  const usedRegions = new Set<number>();

  function isValidPlacement(pos: Position): boolean {
    // Check adjacency with existing crowns
    for (const crown of crowns) {
      if (areAdjacent(crown, pos)) return false;
    }
    return true;
  }

  function backtrack(row: number): void {
    if (row === size) {
      // All rows filled = valid solution
      solutionCount++;
      return;
    }

    for (let col = 0; col < size; col++) {
      if (usedCols.has(col)) continue;

      const pos: Position = { row, col };
      const regionId = getRegionIdAt(puzzle, pos);

      if (usedRegions.has(regionId)) continue;
      if (!isValidPlacement(pos)) continue;

      // Place crown
      crowns.push(pos);
      usedCols.add(col);
      usedRegions.add(regionId);

      backtrack(row + 1);

      // Remove crown
      crowns.pop();
      usedCols.delete(col);
      usedRegions.delete(regionId);
    }
  }

  backtrack(0);
  return solutionCount;
}

/**
 * Find all valid solutions for a square puzzle
 * Uses backtracking to enumerate all valid crown placements
 * @param puzzle - The puzzle (must be square, size 5-10)
 * @param maxSolutions - Maximum number of solutions to find (default 100)
 * @returns Array of solutions, each solution is an array of crown positions
 */
export function findAllSolutions(puzzle: Puzzle, maxSolutions: number = 100): Position[][] {
  const size = puzzle.width;

  // Validate square grid and size range
  if (puzzle.width !== puzzle.height) return [];
  if (size < 5 || size > 10) return [];

  const solutions: Position[][] = [];
  const crowns: Position[] = [];
  const usedCols = new Set<number>();
  const usedRegions = new Set<number>();

  function isValidPlacement(pos: Position): boolean {
    // Check adjacency with existing crowns
    for (const crown of crowns) {
      if (areAdjacent(crown, pos)) return false;
    }
    return true;
  }

  function backtrack(row: number): void {
    if (solutions.length >= maxSolutions) return;

    if (row === size) {
      // All rows filled = valid solution
      solutions.push([...crowns]);
      return;
    }

    for (let col = 0; col < size; col++) {
      if (usedCols.has(col)) continue;

      const pos: Position = { row, col };
      const regionId = getRegionIdAt(puzzle, pos);

      if (usedRegions.has(regionId)) continue;
      if (!isValidPlacement(pos)) continue;

      // Place crown
      crowns.push(pos);
      usedCols.add(col);
      usedRegions.add(regionId);

      backtrack(row + 1);

      // Remove crown
      crowns.pop();
      usedCols.delete(col);
      usedRegions.delete(regionId);
    }
  }

  backtrack(0);
  return solutions;
}

/**
 * Analyze multiple solutions to find cells that could reduce solution count
 * Returns cells that have crowns in some solutions but not others (ambiguous cells)
 * @param solutions - Array of solutions from findAllSolutions
 * @param size - Grid size
 * @returns Object with analysis data for puzzle creation hints
 */
export interface SolutionAnalysis {
  // Cells that have crowns in some solutions but not all
  ambiguousCells: Position[];
  // For each cell, how many solutions have a crown there
  crownFrequency: Map<string, number>;
  // Cells that always have a crown in every solution
  fixedCrowns: Position[];
  // Cells that never have a crown in any solution
  neverCrowns: Position[];
}

export function analyzeSolutions(solutions: Position[][], size: number): SolutionAnalysis {
  if (solutions.length === 0) {
    return {
      ambiguousCells: [],
      crownFrequency: new Map(),
      fixedCrowns: [],
      neverCrowns: [],
    };
  }

  const crownFrequency = new Map<string, number>();

  // Count how often each cell has a crown across all solutions
  for (const solution of solutions) {
    for (const crown of solution) {
      const key = `${crown.row}-${crown.col}`;
      crownFrequency.set(key, (crownFrequency.get(key) || 0) + 1);
    }
  }

  const totalSolutions = solutions.length;
  const ambiguousCells: Position[] = [];
  const fixedCrowns: Position[] = [];
  const neverCrowns: Position[] = [];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const key = `${row}-${col}`;
      const freq = crownFrequency.get(key) || 0;

      if (freq === 0) {
        neverCrowns.push({ row, col });
      } else if (freq === totalSolutions) {
        fixedCrowns.push({ row, col });
      } else {
        ambiguousCells.push({ row, col });
      }
    }
  }

  return {
    ambiguousCells,
    crownFrequency,
    fixedCrowns,
    neverCrowns,
  };
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
