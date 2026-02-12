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

/**
 * Hint generated by logical deduction from the current board state.
 * "cant_be" = this cell can be eliminated; "must_be" = this cell is forced.
 */
export interface Hint {
  type: "cant_be" | "must_be";
  position: Position;
  reason: string;
}

/**
 * Generate a logical deduction hint based on the current board state.
 * Prefers elimination ("cant_be") hints over forced placement ("must_be").
 * Falls back to solution-based elimination when no pure logic deduction is found.
 * Accepts manually excluded positions so hints skip cells the user already eliminated.
 */
export function generateHint(puzzle: Puzzle, crowns: Position[], excluded: Position[] = []): Hint | null {
  const size = puzzle.width;

  // Determine which rows, columns, and regions already have crowns
  const usedRows = new Set(crowns.map((c) => c.row));
  const usedCols = new Set(crowns.map((c) => c.col));
  const usedRegions = new Set(crowns.map((c) => getRegionIdAt(puzzle, c)));

  // Build set of manually excluded positions for quick lookup
  const excludedSet = new Set(excluded.map((p) => `${p.row}-${p.col}`));

  // Build candidate set: cells that could potentially have a crown
  const candidates: Position[] = [];
  for (let row = 0; row < size; row++) {
    if (usedRows.has(row)) continue;
    for (let col = 0; col < size; col++) {
      if (usedCols.has(col)) continue;
      const pos = { row, col };
      const regionId = getRegionIdAt(puzzle, pos);
      if (usedRegions.has(regionId)) continue;
      const isAdjacentToCrown = crowns.some((c) => areAdjacent(c, pos));
      if (isAdjacentToCrown) continue;
      // Skip cells the user already manually excluded
      if (excludedSet.has(`${row}-${col}`)) continue;
      candidates.push(pos);
    }
  }

  if (candidates.length === 0) return null;

  // Helper: get region ID for a candidate
  const regionOf = (pos: Position) => getRegionIdAt(puzzle, pos);

  // --- Strategy 1: Pointing (region confined to one row/column) ---
  // If all candidates for a region are in one row, other candidates in that row can be eliminated.
  for (const region of puzzle.regions) {
    if (usedRegions.has(region.id)) continue;
    const regionCandidates = candidates.filter((c) => regionOf(c) === region.id);
    if (regionCandidates.length <= 1) continue;

    // Check if all in same row
    const rows = new Set(regionCandidates.map((c) => c.row));
    if (rows.size === 1) {
      const row = regionCandidates[0].row;
      const eliminatable = candidates.filter(
        (c) => c.row === row && regionOf(c) !== region.id
      );
      if (eliminatable.length > 0) {
        return {
          type: "cant_be",
          position: eliminatable[0],
          reason: `One region must place its crown in this row, so this cell can't have one`,
        };
      }
    }

    // Check if all in same column
    const cols = new Set(regionCandidates.map((c) => c.col));
    if (cols.size === 1) {
      const col = regionCandidates[0].col;
      const eliminatable = candidates.filter(
        (c) => c.col === col && regionOf(c) !== region.id
      );
      if (eliminatable.length > 0) {
        return {
          type: "cant_be",
          position: eliminatable[0],
          reason: `One region must place its crown in this column, so this cell can't have one`,
        };
      }
    }
  }

  // --- Strategy 2: Claiming (row/column forces a region) ---
  // If all candidates in a row belonging to region X are the ONLY candidates for region X,
  // then the row's crown must come from region X — eliminate the rest.
  for (let row = 0; row < size; row++) {
    if (usedRows.has(row)) continue;
    const rowCandidates = candidates.filter((c) => c.row === row);

    const byRegion = new Map<number, Position[]>();
    for (const c of rowCandidates) {
      const rid = regionOf(c);
      if (!byRegion.has(rid)) byRegion.set(rid, []);
      byRegion.get(rid)!.push(c);
    }

    for (const [rid, cells] of byRegion) {
      const allRegionCandidates = candidates.filter((c) => regionOf(c) === rid);
      if (allRegionCandidates.length === cells.length) {
        // All candidates for this region are in this row
        const eliminatable = rowCandidates.filter((c) => regionOf(c) !== rid);
        if (eliminatable.length > 0) {
          return {
            type: "cant_be",
            position: eliminatable[0],
            reason: `This row must hold a specific region's crown, so this cell can't have one`,
          };
        }
      }
    }
  }

  for (let col = 0; col < size; col++) {
    if (usedCols.has(col)) continue;
    const colCandidates = candidates.filter((c) => c.col === col);

    const byRegion = new Map<number, Position[]>();
    for (const c of colCandidates) {
      const rid = regionOf(c);
      if (!byRegion.has(rid)) byRegion.set(rid, []);
      byRegion.get(rid)!.push(c);
    }

    for (const [rid, cells] of byRegion) {
      const allRegionCandidates = candidates.filter((c) => regionOf(c) === rid);
      if (allRegionCandidates.length === cells.length) {
        const eliminatable = colCandidates.filter((c) => regionOf(c) !== rid);
        if (eliminatable.length > 0) {
          return {
            type: "cant_be",
            position: eliminatable[0],
            reason: `This column must hold a specific region's crown, so this cell can't have one`,
          };
        }
      }
    }
  }

  // --- Strategy 3: Naked single (only 1 candidate in a row/column/region) ---
  for (let row = 0; row < size; row++) {
    if (usedRows.has(row)) continue;
    const rowCandidates = candidates.filter((c) => c.row === row);
    if (rowCandidates.length === 1) {
      return {
        type: "must_be",
        position: rowCandidates[0],
        reason: `This is the only valid cell left in its row`,
      };
    }
  }

  for (let col = 0; col < size; col++) {
    if (usedCols.has(col)) continue;
    const colCandidates = candidates.filter((c) => c.col === col);
    if (colCandidates.length === 1) {
      return {
        type: "must_be",
        position: colCandidates[0],
        reason: `This is the only valid cell left in its column`,
      };
    }
  }

  for (const region of puzzle.regions) {
    if (usedRegions.has(region.id)) continue;
    const regionCandidates = candidates.filter((c) => regionOf(c) === region.id);
    if (regionCandidates.length === 1) {
      return {
        type: "must_be",
        position: regionCandidates[0],
        reason: `This is the only valid cell left in its color region`,
      };
    }
  }

  // --- Fallback: use solution to eliminate a non-solution candidate ---
  if (puzzle.solution) {
    for (const candidate of candidates) {
      const isInSolution = puzzle.solution.some(
        (s) => s.row === candidate.row && s.col === candidate.col
      );
      if (!isInSolution) {
        return {
          type: "cant_be",
          position: candidate,
          reason: `This cell can't have a crown`,
        };
      }
    }
  }

  return null;
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
