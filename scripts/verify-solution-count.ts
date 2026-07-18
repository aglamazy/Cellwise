/**
 * Cross-checks findAllSolutions() against an independent counter.
 *
 * The app counts by row-wise backtracking. This script counts by enumerating
 * every column permutation (row i gets column perm[i], which enforces one crown
 * per row and column by construction) and filtering on region-uniqueness and
 * adjacency. Two different algorithms agreeing is real evidence; one algorithm
 * agreeing with itself is not.
 *
 * Usage: npx tsx scripts/verify-solution-count.ts
 */
import { findAllSolutions, calculatePuzzleNumber } from "../src/lib/game";
import { Puzzle, Position, Region } from "../src/types/game";

const PALETTE = [
  "#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7",
  "#f97316", "#06b6d4", "#ec4899", "#84cc16", "#6366f1",
];

/** Build a Puzzle from a grid of region letters. */
function fromGrid(name: string, grid: string[]): Puzzle {
  const size = grid.length;
  const byLetter = new Map<string, Position[]>();

  grid.forEach((rowStr, row) => {
    [...rowStr].forEach((letter, col) => {
      const cells = byLetter.get(letter) || [];
      cells.push({ row, col });
      byLetter.set(letter, cells);
    });
  });

  const regions: Region[] = [...byLetter.entries()].map(([, cells], i) => ({
    id: i,
    color: PALETTE[i % PALETTE.length],
    cells,
  }));

  return { id: name, name, width: size, height: size, regions, solution: [] };
}

/** Independent count: enumerate column permutations. */
function countByPermutation(puzzle: Puzzle): number {
  const size = puzzle.width;

  const regionAt: number[][] = Array.from({ length: size }, () =>
    Array(size).fill(-1)
  );
  puzzle.regions.forEach((region) => {
    region.cells.forEach((c) => {
      regionAt[c.row][c.col] = region.id;
    });
  });

  let count = 0;
  const perm: number[] = [];
  const used = new Set<number>();

  const recurse = (row: number) => {
    if (row === size) {
      const regionsSeen = new Set<number>();
      for (let r = 0; r < size; r++) {
        const id = regionAt[r][perm[r]];
        if (regionsSeen.has(id)) return;
        regionsSeen.add(id);
      }
      for (let r = 0; r + 1 < size; r++) {
        // Non-adjacent: consecutive rows may not have touching columns.
        // Non-consecutive rows can never touch, since |rowDiff| > 1.
        if (Math.abs(perm[r] - perm[r + 1]) <= 1) return;
      }
      count++;
      return;
    }
    for (let col = 0; col < size; col++) {
      if (used.has(col)) continue;
      used.add(col);
      perm.push(col);
      recurse(row + 1);
      perm.pop();
      used.delete(col);
    }
  };

  recurse(0);
  return count;
}

/** Random connected-ish region layout, for fuzzing both implementations. */
function randomPuzzle(size: number, seed: number): Puzzle {
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  const grid: number[][] = Array.from({ length: size }, () =>
    Array(size).fill(-1)
  );
  const letters = "abcdefghij";

  // Seed each region on a distinct cell, then grow by random flood.
  const frontiers: Position[][] = [];
  for (let i = 0; i < size; i++) {
    let r: number, c: number;
    do {
      r = Math.floor(rand() * size);
      c = Math.floor(rand() * size);
    } while (grid[r][c] !== -1);
    grid[r][c] = i;
    frontiers.push([{ row: r, col: c }]);
  }

  let remaining = size * size - size;
  while (remaining > 0) {
    let progressed = false;
    for (let i = 0; i < size && remaining > 0; i++) {
      const f = frontiers[i];
      if (f.length === 0) continue;
      const idx = Math.floor(rand() * f.length);
      const cell = f[idx];
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      const open = dirs
        .map(([dr, dc]) => ({ row: cell.row + dr, col: cell.col + dc }))
        .filter(
          (p) =>
            p.row >= 0 && p.row < size && p.col >= 0 && p.col < size &&
            grid[p.row][p.col] === -1
        );
      if (open.length === 0) {
        f.splice(idx, 1);
        continue;
      }
      const pick = open[Math.floor(rand() * open.length)];
      grid[pick.row][pick.col] = i;
      f.push(pick);
      remaining--;
      progressed = true;
    }
    if (!progressed) break;
  }

  // Any stragglers join a neighbouring region.
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === -1) grid[r][c] = grid[r][c > 0 ? c - 1 : c] ?? 0;
    }
  }

  return fromGrid(
    `random-${seed}`,
    grid.map((row) => row.map((i) => letters[i]).join(""))
  );
}

// The 8x8 from the editor screenshot: Solutions: 71
const SCREENSHOT = fromGrid("screenshot", [
  "abbbdddd",
  "acccdddd",
  "acccdddd",
  "cceedddd",
  "eeeefghh",
  "eeeefggh",
  "eeefffgg",
  "eeefffgg",
]);

const HIGH = 100000;

function check(label: string, puzzle: Puzzle) {
  // calculatePuzzleNumber is what the editor actually displays; findAllSolutions
  // is what the hint analysis uses. Both must match the independent count.
  const displayed = calculatePuzzleNumber(puzzle);
  const enumerated = findAllSolutions(puzzle, HIGH).length;
  const independent = countByPermutation(puzzle);
  const agree = displayed === independent && enumerated === independent;
  return { label, displayed, enumerated, independent, agree };
}

const rows = [check("screenshot 8x8", SCREENSHOT)];

for (let seed = 1; seed <= 12; seed++) {
  const size = 5 + (seed % 4);
  rows.push(check(`random ${size}x${size} seed=${seed}`, randomPuzzle(size, seed)));
}

console.table(rows);
console.log(
  rows.every((r) => r.agree)
    ? "ALL AGREE — the two independent counters match on every case"
    : "MISMATCH — findAllSolutions disagrees with the permutation counter"
);

// Also report on the puzzles actually published, since a good Star Battle
// should have exactly one solution.
const LIVE = process.env.CELLWISE_URL || "https://cellwise.vercel.app";

async function checkLive() {
  const res = await fetch(`${LIVE}/api/puzzles`);
  const puzzles = (await res.json()) as Puzzle[];
  const live = puzzles.map((p) => {
    const solutions = calculatePuzzleNumber(p);
    return {
      name: p.name,
      size: `${p.width}x${p.height}`,
      solutions,
      verdict:
        solutions === 1 ? "unique" : solutions === 0 ? "UNSOLVABLE" : "ambiguous",
    };
  });
  console.log(`\nPublished puzzles at ${LIVE}:`);
  console.table(live);
}

checkLive().catch((e) => console.error("live check skipped:", e.message));
