import { Position, Puzzle, Region } from "@/types/game";

/**
 * Forces a puzzle to have exactly one solution while keeping the author's
 * crowns, and changing as few cells as possible.
 *
 * Why this is possible at all
 * --------------------------
 * The crowns the author placed define the intended solution S. Row, column and
 * adjacency constraints are already fixed by where those crowns sit, so the
 * only lever left is region membership — "one crown per region".
 *
 * Recolouring a cell that is NOT a crown of S can never break S: the cell's old
 * region still holds its crown, and its new region still holds exactly one. So
 * every move this makes keeps the puzzle solvable, and the search only has to
 * push the solution count down to 1.
 *
 * A rival solution dies when two of its crowns end up in the same region, which
 * is what recolouring a rival's crown cell into another rival crown's region
 * achieves.
 */

const ORTHOGONAL = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

const key = (p: Position) => `${p.row}-${p.col}`;

export function puzzleFromCellColors(
  size: number,
  cellColors: (number | null)[][]
): Puzzle {
  const byColor = new Map<number, Position[]>();

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const colorIdx = cellColors[row]?.[col];
      if (colorIdx === null || colorIdx === undefined) continue;
      const cells = byColor.get(colorIdx) || [];
      cells.push({ row, col });
      byColor.set(colorIdx, cells);
    }
  }

  const regions: Region[] = [];
  let id = 0;
  for (const [, cells] of byColor) {
    regions.push({ id: id++, color: "", cells });
  }

  return {
    id: "temp",
    name: "temp",
    width: size,
    height: size,
    regions,
    solution: [],
  };
}

/**
 * Counts solutions directly off the colour grid, stopping at `cap`.
 *
 * Faster than going through findAllSolutions(): it never materialises the
 * solutions, and because there is exactly one crown per row, two crowns can
 * only touch if they are in consecutive rows — so adjacency is a single check
 * against the previous row rather than a scan of every placed crown. The search
 * runs thousands of times during a repair, so this matters.
 */
export function countSolutions(
  size: number,
  cellColors: (number | null)[][],
  cap: number
): number {
  const usedCols = new Array<boolean>(size).fill(false);
  const usedRegions = new Set<number>();
  const colAtRow = new Array<number>(size).fill(-1);
  let count = 0;

  const backtrack = (row: number): void => {
    if (count >= cap) return;
    if (row === size) {
      count++;
      return;
    }

    for (let col = 0; col < size; col++) {
      if (usedCols[col]) continue;
      if (row > 0 && Math.abs(colAtRow[row - 1] - col) <= 1) continue;

      const regionId = cellColors[row][col];
      if (regionId === null || regionId === undefined) continue;
      if (usedRegions.has(regionId)) continue;

      usedCols[col] = true;
      usedRegions.add(regionId);
      colAtRow[row] = col;

      backtrack(row + 1);

      usedCols[col] = false;
      usedRegions.delete(regionId);
      colAtRow[row] = -1;

      if (count >= cap) return;
    }
  };

  backtrack(0);
  return count;
}

/** Would the region keep its cells connected if `cell` left it? */
function staysConnectedWithout(
  size: number,
  cellColors: (number | null)[][],
  color: number,
  cell: Position
): boolean {
  const members: Position[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (
        cellColors[row][col] === color &&
        !(row === cell.row && col === cell.col)
      ) {
        members.push({ row, col });
      }
    }
  }
  if (members.length === 0) return false;

  const remaining = new Set(members.map(key));
  const seen = new Set([key(members[0])]);
  const queue = [members[0]];

  while (queue.length > 0) {
    const p = queue.shift()!;
    for (const [dr, dc] of ORTHOGONAL) {
      const next = { row: p.row + dr, col: p.col + dc };
      const k = key(next);
      if (remaining.has(k) && !seen.has(k)) {
        seen.add(k);
        queue.push(next);
      }
    }
  }

  return seen.size === remaining.size;
}

type BestMove = { move: Move; score: number } | null;

interface Move {
  row: number;
  col: number;
  to: number;
  from: number;
  authored: boolean;
}

/**
 * Finds one solution that isn't the intended one, or null if the puzzle is
 * already unique. Stops at the first rival — we only ever need one to attack.
 */
function firstRival(
  size: number,
  cellColors: (number | null)[][],
  intended: Set<string>
): Position[] | null {
  const usedCols = new Array<boolean>(size).fill(false);
  const usedRegions = new Set<number>();
  const colAtRow = new Array<number>(size).fill(-1);
  let found: Position[] | null = null;

  const backtrack = (row: number): void => {
    if (found) return;
    if (row === size) {
      const candidate: Position[] = colAtRow.map((col, r) => ({ row: r, col }));
      if (!candidate.every((p) => intended.has(key(p)))) found = candidate;
      return;
    }

    for (let col = 0; col < size; col++) {
      if (usedCols[col]) continue;
      if (row > 0 && Math.abs(colAtRow[row - 1] - col) <= 1) continue;

      const regionId = cellColors[row][col];
      if (regionId === null || regionId === undefined) continue;
      if (usedRegions.has(regionId)) continue;

      usedCols[col] = true;
      usedRegions.add(regionId);
      colAtRow[row] = col;

      backtrack(row + 1);

      usedCols[col] = false;
      usedRegions.delete(regionId);
      colAtRow[row] = -1;

      if (found) return;
    }
  };

  backtrack(0);
  return found;
}

/**
 * Moves that specifically kill `rival`: take one of its crowns that isn't ours
 * and merge that cell into the region of another of its crowns, so the rival
 * ends up with two crowns in one region.
 *
 * Far more focused than scanning every legal recolour — each candidate is
 * guaranteed to eliminate this rival, so the search converges in fewer moves
 * instead of wandering.
 */
function movesKilling(
  size: number,
  cellColors: (number | null)[][],
  rival: Position[],
  intended: Set<string>,
  authored: Set<string>
): Move[] {
  const moves: Move[] = [];

  for (const cell of rival) {
    const k = key(cell);
    if (intended.has(k)) continue;

    const from = cellColors[cell.row][cell.col];
    if (from === null || from === undefined) continue;

    const adjacent = new Set<number>();
    for (const [dr, dc] of ORTHOGONAL) {
      const r = cell.row + dr;
      const c = cell.col + dc;
      if (r < 0 || r >= size || c < 0 || c >= size) continue;
      const neighbour = cellColors[r][c];
      if (neighbour !== null && neighbour !== undefined) adjacent.add(neighbour);
    }

    if (!staysConnectedWithout(size, cellColors, from, cell)) continue;

    for (const other of rival) {
      if (other.row === cell.row && other.col === cell.col) continue;
      const target = cellColors[other.row][other.col];
      if (target === null || target === undefined || target === from) continue;
      if (!adjacent.has(target)) continue;
      moves.push({
        row: cell.row,
        col: cell.col,
        to: target,
        from,
        authored: authored.has(k),
      });
    }
  }

  return moves;
}

/** Every legal single-cell recolour that preserves the intended solution. */
function legalMoves(
  size: number,
  cellColors: (number | null)[][],
  intended: Set<string>,
  authored: Set<string>
): Move[] {
  const moves: Move[] = [];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const k = `${row}-${col}`;
      // A crown's own cell must keep its region, or that region loses its crown.
      if (intended.has(k)) continue;

      const from = cellColors[row][col];
      if (from === null || from === undefined) continue;

      const targets = new Set<number>();
      for (const [dr, dc] of ORTHOGONAL) {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const neighbour = cellColors[r][c];
        // Joining a region requires touching it, or it would be disconnected.
        if (neighbour !== null && neighbour !== undefined && neighbour !== from) {
          targets.add(neighbour);
        }
      }
      if (targets.size === 0) continue;
      if (!staysConnectedWithout(size, cellColors, from, { row, col })) continue;

      for (const to of targets) {
        moves.push({ row, col, to, from, authored: authored.has(k) });
      }
    }
  }

  return moves;
}

/**
 * Grows the existing regions outward at random until every cell is coloured.
 *
 * Frontiers start from whatever is already painted, so the author's regions are
 * extended rather than replaced. Unlike a balanced breadth-first fill — which
 * expands every region in lockstep and produces fat, blobby regions — this grows
 * one random region at a time, giving the ragged interlocking shapes that
 * actually constrain a solution.
 */
function growRegions(
  size: number,
  base: (number | null)[][],
  rand: () => number
): (number | null)[][] {
  const colors = base.map((row) => [...row]);
  const frontiers = new Map<number, Position[]>();

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const colorIdx = colors[row][col];
      if (colorIdx === null || colorIdx === undefined) continue;
      const list = frontiers.get(colorIdx) || [];
      list.push({ row, col });
      frontiers.set(colorIdx, list);
    }
  }

  let remaining = 0;
  for (let row = 0; row < size; row++)
    for (let col = 0; col < size; col++)
      if (colors[row][col] === null || colors[row][col] === undefined) remaining++;

  while (remaining > 0) {
    const live = [...frontiers.entries()].filter(([, f]) => f.length > 0);
    if (live.length === 0) break;

    const [colorIdx, frontier] = live[Math.floor(rand() * live.length)];
    const idx = Math.floor(rand() * frontier.length);
    const cell = frontier[idx];

    const open: Position[] = [];
    for (const [dr, dc] of ORTHOGONAL) {
      const r = cell.row + dr;
      const c = cell.col + dc;
      if (r < 0 || r >= size || c < 0 || c >= size) continue;
      if (colors[r][c] === null || colors[r][c] === undefined) {
        open.push({ row: r, col: c });
      }
    }

    if (open.length === 0) {
      frontier.splice(idx, 1);
      continue;
    }

    const pick = open[Math.floor(rand() * open.length)];
    colors[pick.row][pick.col] = colorIdx;
    frontier.push(pick);
    remaining--;
  }

  // Anything the growth couldn't reach joins a neighbouring region, so the
  // board is never left partially coloured.
  let guard = 0;
  while (remaining > 0 && guard++ < size * size) {
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (colors[row][col] !== null && colors[row][col] !== undefined) continue;
        for (const [dr, dc] of ORTHOGONAL) {
          const neighbour = colors[row + dr]?.[col + dc];
          if (neighbour !== null && neighbour !== undefined) {
            colors[row][col] = neighbour;
            remaining--;
            break;
          }
        }
      }
    }
  }

  return colors;
}

export interface UniquifyResult {
  cellColors: (number | null)[][];
  /** How many cells ended up a different colour than they started. */
  cellsChanged: number;
  unique: boolean;
  /** Final solution count (capped for speed). */
  solutions: number;
}

/**
 * @param authored cells the author painted by hand — moved only if nothing else
 *                 makes progress, so their work survives where possible.
 */
export function makeSolutionUnique(
  size: number,
  inputColors: (number | null)[][],
  solution: Position[],
  authored: Set<string> = new Set(),
  maxMoves = 240,
  /** Wall-clock stop, so a hard board can't lock up the editor. */
  deadline = Number.MAX_SAFE_INTEGER
): UniquifyResult {
  const cellColors = inputColors.map((row) => [...row]);
  const intended = new Set(solution.map(key));

  // The cap has to sit above the current count, or every candidate scores the
  // same and the search has no gradient to follow. This was the flaw in the
  // first attempt: with a cap of 60 and 544 solutions on the board, all moves
  // looked identical and it cycled without improving.
  const capFor = (count: number) => Math.min(Math.max(count * 2, 64), 900);

  // Deterministic shuffle — the editor must behave the same way twice.
  let seed = size * 7919 + solution.length;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  let current = countSolutions(size, cellColors, 4000);


  // Pure hill-climbing stalls while a couple of rivals are still alive, because
  // no single recolour improves things on its own. Allowing equal-scoring moves,
  // with a short tabu list to stop the search walking back, gets over those
  // plateaus. The best board seen is kept regardless of where the walk ends.
  const tabu = new Map<string, number>();
  const TABU_TENURE = 10;
  const SAMPLE = 28;

  let bestColors = cellColors.map((row) => [...row]);
  let bestScore = current;
  let stalled = 0;

  for (let move = 0; move < maxMoves && current > 1; move++) {
    if (Date.now() > deadline) break;

    // Attack a specific rival first: those moves are few and each is guaranteed
    // to eliminate it. Only fall back to scanning every legal recolour when the
    // targeted set is exhausted, which is what happens near the end.
    const rival = firstRival(size, cellColors, intended);
    if (!rival) break; // already unique

    const scoreCap = capFor(current);

    // In the endgame only a handful of rivals remain, each solve is nearly free,
    // and the one move that finishes the job may well sit outside a random
    // sample — so check every candidate rather than a subset.
    const sampleSize = current <= 8 ? Number.MAX_SAFE_INTEGER : SAMPLE;

    const evaluate = (pool: Move[], incoming: BestMove): BestMove => {
      let found: BestMove = incoming;

      // Untouched cells first, then a random sample, so a wide board doesn't
      // make each iteration cost hundreds of solves.
      pool.sort((a, b) => Number(a.authored) - Number(b.authored) || rand() - 0.5);

      for (const candidate of pool.slice(0, sampleSize)) {
        const cellKey = `${candidate.row}-${candidate.col}`;
        const isTabu = (tabu.get(cellKey) ?? -Infinity) > move - TABU_TENURE;

        const previous = cellColors[candidate.row][candidate.col];
        cellColors[candidate.row][candidate.col] = candidate.to;
        const score = countSolutions(size, cellColors, scoreCap);
        cellColors[candidate.row][candidate.col] = previous;

        // Reaching one solution ends the search outright, tabu or not.
        if (score === 1) return { move: candidate, score };
        // A move that makes the puzzle unsolvable has lost the intended
        // solution, which should be impossible — guard anyway.
        if (score === 0) continue;
        if (isTabu) continue;
        if (found === null || score < found.score) found = { move: candidate, score };
      }

      return found;
    };

    let best = evaluate(
      movesKilling(size, cellColors, rival, intended, authored),
      null
    );

    // The targeted moves each kill this rival but may leave more solutions than
    // we started with. Widening to every legal recolour before giving up is what
    // keeps the search from stopping short of unique.
    if (best === null || (best.score !== 1 && best.score >= current)) {
      best = evaluate(legalMoves(size, cellColors, intended, authored), best);
    }

    // Nothing legal and non-tabu this round; let the tabu list age out.
    if (best === null) continue;

    // Near the end, refusing to go uphill just parks the search in a local
    // optimum — the last rival often needs two recolours, and taking the first
    // alone looks like a regression. Allow a bounded uphill walk there; the tabu
    // list stops it retracing, and bestColors keeps the best board seen.
    if (best.score > current) {
      const endgame = current <= 8;
      if (!endgame || stalled >= 30) break;
      stalled++;
    } else {
      stalled = 0;
    }

    cellColors[best.move.row][best.move.col] = best.move.to;
    tabu.set(`${best.move.row}-${best.move.col}`, move);
    current = best.score;

    if (current < bestScore) {
      bestScore = current;
      bestColors = cellColors.map((row) => [...row]);
    }
  }

  if (bestScore < current) {
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) cellColors[row][col] = bestColors[row][col];
    }
    current = bestScore;
  }

  const solutions = countSolutions(size, cellColors, Math.max(2, current + 1));

  let cellsChanged = 0;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (cellColors[row][col] !== inputColors[row][col]) cellsChanged++;
    }
  }

  return { cellColors, cellsChanged, unique: solutions === 1, solutions };
}

/**
 * Auto-Complete's region step: fill every uncoloured cell, then force the board
 * to a single solution.
 *
 * Tries several random growths and keeps the one that starts with the fewest
 * solutions — a better starting board means the repair has less to undo, which
 * is both faster and gentler on the author's layout. Cells the author painted
 * are never overwritten by the fill, and are the last thing the repair touches.
 */
export function completeRegions(
  size: number,
  cellColors: (number | null)[][],
  solution: Position[],
  authored: Set<string> = new Set(),
  attempts = 10,
  rounds = 8,
  /** 0 = scale with board size; small boards finish in milliseconds. */
  timeBudgetMs = 0
): UniquifyResult {
  // A 5x5 converges almost instantly, while a 10x10 starts with thousands of
  // solutions and genuinely needs the time. Scaling keeps the common case snappy
  // without giving up on the big boards.
  const budget =
    timeBudgetMs > 0
      ? timeBudgetMs
      : size <= 7
        ? 2000
        : size === 8
          ? 4000
          : size === 9
            ? 9000
            : 15000;
  let seed = size * 104729 + solution.length * 31 + 7;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const deadline = Date.now() + budget;

  // A repair occasionally stalls one rival short of unique, because finishing
  // would take two simultaneous recolours rather than one. Rather than search
  // pairs — expensive — start over from a fresh growth: a different layout
  // almost always converges, and each round is cheap.
  let repaired: UniquifyResult | null = null;

  for (let round = 0; round < rounds; round++) {
    let bestFill = growRegions(size, cellColors, rand);
    let bestCount = countSolutions(size, bestFill, 4000);

    for (let i = 1; i < attempts && bestCount > 1; i++) {
      const candidate = growRegions(size, cellColors, rand);
      const count = countSolutions(size, candidate, Math.max(2, bestCount));
      if (count < bestCount) {
        bestCount = count;
        bestFill = candidate;
      }
    }

    const result = makeSolutionUnique(
      size,
      bestFill,
      solution,
      authored,
      240,
      deadline
    );

    if (result.unique) {
      repaired = result;
      break;
    }
    // Keep the closest attempt in case the budget runs out.
    if (repaired === null || result.solutions < repaired.solutions) {
      repaired = result;
    }
    if (Date.now() > deadline) break;
  }

  if (!repaired) {
    repaired = makeSolutionUnique(size, cellColors, solution, authored);
  }

  // Report changes against the board the author actually had, not against the
  // intermediate fill.
  let cellsChanged = 0;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const before = cellColors[row][col];
      if (before !== null && before !== undefined &&
          before !== repaired.cellColors[row][col]) {
        cellsChanged++;
      }
    }
  }

  return { ...repaired, cellsChanged };
}
