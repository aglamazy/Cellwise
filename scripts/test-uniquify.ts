/**
 * Exercises makeSolutionUnique() over many randomly generated boards of the
 * kind Auto-Complete produces: random valid crown placement, then a balanced
 * flood fill. Reports how often it reaches a unique solution and how many cells
 * it had to recolour.
 *
 * Usage: npx tsx scripts/test-uniquify.ts [count]
 */
import { Position } from "../src/types/game";
import { calculatePuzzleNumber } from "../src/lib/game";
import { completeRegions, puzzleFromCellColors } from "../src/lib/puzzleUnique";

function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Random full crown placement: one per row/column, none touching. */
function randomCrowns(size: number, rand: () => number): Position[] | null {
  const placed: Position[] = [];
  const compatible = (a: Position, b: Position) =>
    a.row !== b.row &&
    a.col !== b.col &&
    !(Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1);

  const search = (row: number): boolean => {
    if (row === size) return true;
    const cols = [...Array(size).keys()].sort(() => rand() - 0.5);
    for (const col of cols) {
      const cand = { row, col };
      if (placed.every((p) => compatible(p, cand))) {
        placed.push(cand);
        if (search(row + 1)) return true;
        placed.pop();
      }
    }
    return false;
  };

  return search(0) ? placed : null;
}

/** The same balanced flood fill Auto-Complete uses. */
function floodFill(size: number, crowns: Position[]): (number | null)[][] {
  const colors: (number | null)[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill(null));

  crowns.forEach((c, i) => {
    colors[c.row][c.col] = i;
  });

  const queues: Position[][] = crowns.map((c) => [c]);
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < crowns.length; i++) {
      const next: Position[] = [];
      for (const pos of queues[i]) {
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nr = pos.row + dr;
          const nc = pos.col + dc;
          if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
          if (colors[nr][nc] === null) {
            colors[nr][nc] = i;
            next.push({ row: nr, col: nc });
            changed = true;
          }
        }
      }
      queues[i] = next;
    }
  }

  return colors;
}

const total = Number(process.argv[2] || 40);
const rows: Record<string, unknown>[] = [];
let failures = 0;
let totalChanged = 0;
let totalBefore = 0;

for (let i = 0; i < total; i++) {
  const size = 5 + (i % 6); // 5..10
  const rand = makeRng(i * 7919 + 13);
  const crowns = randomCrowns(size, rand);
  if (!crowns) continue;

  const before = floodFill(size, crowns);
  const beforeCount = calculatePuzzleNumber(puzzleFromCellColors(size, before));

  const started = Date.now();
  const seeded: (number | null)[][] = Array(size).fill(null).map(() => Array(size).fill(null));
  crowns.forEach((c, i) => { seeded[c.row][c.col] = i; });
  const result = completeRegions(size, seeded, crowns);
  const ms = Date.now() - started;

  // Independent re-check: does the intended solution survive, and is the final
  // board genuinely unique according to the uncapped counter?
  const finalCount = calculatePuzzleNumber(
    puzzleFromCellColors(size, result.cellColors)
  );

  // Every cell must still be coloured, and every region must still hold exactly
  // one of the author's crowns.
  let allColored = true;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (result.cellColors[r][c] === null) allColored = false;

  const crownRegions = new Set(
    crowns.map((c) => result.cellColors[c.row][c.col])
  );
  const regionCount = new Set(result.cellColors.flat().filter((v) => v !== null)).size;
  const oneCrownPerRegion =
    crownRegions.size === crowns.length && regionCount === crowns.length;

  const ok = finalCount === 1 && allColored && oneCrownPerRegion;
  if (!ok) failures++;
  totalChanged += result.cellsChanged;
  totalBefore += beforeCount;

  if (i < 14 || !ok) {
    rows.push({
      size: `${size}x${size}`,
      before: beforeCount,
      after: finalCount,
      changed: result.cellsChanged,
      pct: `${((result.cellsChanged / (size * size)) * 100).toFixed(0)}%`,
      allColored,
      oneCrownPerRegion,
      ms,
      ok,
    });
  }
}

console.table(rows);
console.log(`\nboards tested: ${total}`);
console.log(`avg solutions before: ${(totalBefore / total).toFixed(1)}`);
console.log(`avg cells recoloured: ${(totalChanged / total).toFixed(1)}`);
console.log(failures === 0 ? "ALL UNIQUE + VALID" : `FAILURES: ${failures}`);
