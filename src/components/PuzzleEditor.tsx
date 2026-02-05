"use client";

import { useState, useCallback, useMemo } from "react";
import { Position, Region, Puzzle } from "@/types/game";
import { Crown } from "./Crown";
import { calculatePuzzleNumber, findAllSolutions, analyzeSolutions, SolutionAnalysis } from "@/lib/game";

const COLORS = [
  "#ef4444", // red
  "#3b82f6", // blue
  "#22c55e", // green
  "#eab308", // yellow
  "#a855f7", // purple
  "#f97316", // orange
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
  "#6366f1", // indigo
];

type EditorMode = "paint" | "solution";

interface PuzzleEditorProps {
  onSave: (puzzle: Puzzle) => Promise<void>;
  onCancel: () => void;
  initialPuzzle?: Puzzle;
}

function puzzleToCellColors(puzzle: Puzzle): (number | null)[][] {
  const cellColors: (number | null)[][] = Array(puzzle.height)
    .fill(null)
    .map(() => Array(puzzle.width).fill(null));

  puzzle.regions.forEach((region, index) => {
    region.cells.forEach((cell) => {
      cellColors[cell.row][cell.col] = index;
    });
  });

  return cellColors;
}

export function PuzzleEditor({
  onSave,
  onCancel,
  initialPuzzle,
}: PuzzleEditorProps) {
  const [name, setName] = useState(initialPuzzle?.name || "");
  const [size, setSize] = useState(initialPuzzle?.width || 5);
  const [sizeInput, setSizeInput] = useState(
    String(initialPuzzle?.width || 5)
  );
  const [mode, setMode] = useState<EditorMode>("solution");
  const [selectedColor, setSelectedColor] = useState(0);
  const [cellColors, setCellColors] = useState<(number | null)[][]>(() =>
    initialPuzzle
      ? puzzleToCellColors(initialPuzzle)
      : Array(5)
          .fill(null)
          .map(() => Array(5).fill(null))
  );
  const [solution, setSolution] = useState<Position[]>(
    initialPuzzle?.solution || []
  );
  const [puzzleId] = useState(initialPuzzle?.id || `puzzle-${Date.now()}`);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showHints, setShowHints] = useState(false);

  const handleResize = (newSize: number) => {
    // Adjust cellColors grid
    const newCellColors: (number | null)[][] = Array(newSize)
      .fill(null)
      .map((_, row) =>
        Array(newSize)
          .fill(null)
          .map((_, col) =>
            row < cellColors.length && col < (cellColors[row]?.length || 0)
              ? cellColors[row][col]
              : null
          )
      );
    setCellColors(newCellColors);

    // Remove solution crowns that are out of bounds
    setSolution((prev) =>
      prev.filter((pos) => pos.row < newSize && pos.col < newSize)
    );

    setSize(newSize);
    setSizeInput(String(newSize));
  };

  const handleSizeInputChange = (value: string) => {
    setSizeInput(value);
    const num = Number(value);
    // Only apply valid sizes (5-10)
    if (!isNaN(num) && num >= 5 && num <= 10) {
      handleResize(num);
    }
  };

  const isSizeInputValid = () => {
    const num = Number(sizeInput);
    return !isNaN(num) && num >= 5 && num <= 10;
  };

  const incrementSize = () => {
    if (size < 10) {
      handleResize(size + 1);
    }
  };

  const decrementSize = () => {
    if (size > 5) {
      handleResize(size - 1);
    }
  };

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (mode === "paint") {
        setCellColors((prev) => {
          const newColors = prev.map((r) => [...r]);
          newColors[row][col] = newColors[row][col] === selectedColor ? null : selectedColor;
          return newColors;
        });
      } else {
        setSolution((prev) => {
          const exists = prev.find((p) => p.row === row && p.col === col);
          if (exists) {
            return prev.filter((p) => p.row !== row || p.col !== col);
          }
          return [...prev, { row, col }];
        });
      }
    },
    [mode, selectedColor]
  );

  const getRegions = (): Region[] => {
    const colorToRegion = new Map<number, Position[]>();

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const colorIdx = cellColors[row]?.[col];
        if (colorIdx !== null && colorIdx !== undefined) {
          const cells = colorToRegion.get(colorIdx) || [];
          cells.push({ row, col });
          colorToRegion.set(colorIdx, cells);
        }
      }
    }

    const regions: Region[] = [];
    let id = 0;
    for (const [colorIdx, cells] of colorToRegion) {
      regions.push({
        id: id++,
        color: COLORS[colorIdx],
        cells,
      });
    }

    return regions;
  };

  const autoCompletePuzzle = () => {
    if (conflicts.size > 0) {
      setError("Fix crown conflicts first");
      return;
    }

    // Step 1: Place crowns in empty rows/columns (preserve existing)
    const newSolution = [...solution];
    const usedRows = new Set(newSolution.map((c) => c.row));
    const usedCols = new Set(newSolution.map((c) => c.col));

    // Find rows and columns that need crowns
    const emptyRows: number[] = [];
    const emptyCols: number[] = [];
    for (let r = 0; r < size; r++) {
      if (!usedRows.has(r)) emptyRows.push(r);
    }
    for (let c = 0; c < size; c++) {
      if (!usedCols.has(c)) emptyCols.push(c);
    }

    // Try to place crowns in empty rows/columns
    const isValidPlacement = (row: number, col: number, crowns: Position[]): boolean => {
      for (const crown of crowns) {
        if (crown.row === row || crown.col === col) return false;
        // Check adjacency (9-neighborhood)
        if (Math.abs(crown.row - row) <= 1 && Math.abs(crown.col - col) <= 1) return false;
      }
      return true;
    };

    // Greedy placement: for each empty row, find a valid column
    for (const row of emptyRows) {
      for (const col of emptyCols) {
        if (isValidPlacement(row, col, newSolution)) {
          newSolution.push({ row, col });
          usedRows.add(row);
          usedCols.add(col);
          emptyCols.splice(emptyCols.indexOf(col), 1);
          break;
        }
      }
    }

    // Step 2: Flood fill only uncolored cells (preserve existing colors)
    const newCellColors = cellColors.map((row) => [...row]);

    // Map crowns to their colors (use existing color if cell is already colored)
    const crownToColor = new Map<string, number>();

    // First, use existing colors for crowns that are on colored cells
    newSolution.forEach((crown) => {
      const existingColor = newCellColors[crown.row][crown.col];
      if (existingColor !== null) {
        crownToColor.set(`${crown.row}-${crown.col}`, existingColor);
      }
    });

    // Assign new colors only to crowns on uncolored cells
    let nextColor = 0;
    const usedColorSet = new Set(crownToColor.values());
    newSolution.forEach((crown) => {
      const key = `${crown.row}-${crown.col}`;
      if (!crownToColor.has(key)) {
        while (usedColorSet.has(nextColor)) nextColor++;
        crownToColor.set(key, nextColor);
        newCellColors[crown.row][crown.col] = nextColor;
        usedColorSet.add(nextColor);
        nextColor++;
      }
    });

    // BFS flood fill from all crowns simultaneously, only filling uncolored cells
    const queues: Position[][] = newSolution.map((crown) => [crown]);

    let changed = true;
    while (changed) {
      changed = false;

      for (let i = 0; i < newSolution.length; i++) {
        const crown = newSolution[i];
        const colorIdx = crownToColor.get(`${crown.row}-${crown.col}`)!;
        const queue = queues[i];
        const nextQueue: Position[] = [];

        for (const pos of queue) {
          // Expand to orthogonal neighbors, only filling uncolored cells
          const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          for (const [dr, dc] of dirs) {
            const nr = pos.row + dr;
            const nc = pos.col + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
              if (newCellColors[nr][nc] === null) {
                newCellColors[nr][nc] = colorIdx;
                nextQueue.push({ row: nr, col: nc });
                changed = true;
              }
            }
          }
        }

        queues[i] = nextQueue;
      }
    }

    setSolution(newSolution);
    setCellColors(newCellColors);
    setMode("paint");
    setError("");
  };

  const validatePuzzle = (): string | null => {
    const regions = getRegions();

    // Check crown count matches grid dimensions (need one crown per row and column)
    if (solution.length !== size) {
      return `Need ${size} crowns (one per row), have ${solution.length}`;
    }
    if (solution.length !== size) {
      return `Need ${size} crowns (one per column), have ${solution.length}`;
    }

    // Check all cells are colored
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (cellColors[row]?.[col] === null || cellColors[row]?.[col] === undefined) {
          return "All cells must be colored";
        }
      }
    }

    // Check solution count
    if (solution.length !== regions.length) {
      return `Need ${regions.length} crowns (one per region), have ${solution.length}`;
    }

    // Check one crown per row
    const rows = new Set(solution.map((s) => s.row));
    if (rows.size !== solution.length) {
      return "Each row can only have one crown";
    }

    // Check one crown per column
    const cols = new Set(solution.map((s) => s.col));
    if (cols.size !== solution.length) {
      return "Each column can only have one crown";
    }

    // Check one crown per region
    const crownRegions = new Set<number>();
    for (const pos of solution) {
      const colorIdx = cellColors[pos.row]?.[pos.col];
      if (colorIdx === null || colorIdx === undefined) {
        return "Crown must be on a colored cell";
      }
      if (crownRegions.has(colorIdx)) {
        return "Each region can only have one crown";
      }
      crownRegions.add(colorIdx);
    }

    // Check no adjacent crowns
    for (let i = 0; i < solution.length; i++) {
      for (let j = i + 1; j < solution.length; j++) {
        const rowDiff = Math.abs(solution[i].row - solution[j].row);
        const colDiff = Math.abs(solution[i].col - solution[j].col);
        if (rowDiff <= 1 && colDiff <= 1) {
          return "Crowns cannot be adjacent to each other";
        }
      }
    }

    return null;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Puzzle name is required");
      return;
    }

    const validationError = validatePuzzle();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const puzzle: Puzzle = {
        id: puzzleId,
        name: name.trim(),
        width: size,
        height: size,
        regions: getRegions(),
        solution,
      };

      await onSave(puzzle);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save puzzle");
    } finally {
      setSaving(false);
    }
  };

  const usedColors = new Set<number>();
  cellColors.forEach((row) => row.forEach((c) => c !== null && usedColors.add(c)));
  const regionCount = usedColors.size;

  // Check if all cells are colored (board is complete)
  const isBoardComplete = useMemo(() => {
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (cellColors[row]?.[col] === null || cellColors[row]?.[col] === undefined) {
          return false;
        }
      }
    }
    return true;
  }, [cellColors, size]);

  // Calculate solution count when board is complete
  const solutionCount = useMemo(() => {
    if (!isBoardComplete) return null;

    // Build a puzzle object from current state to calculate solutions
    const regions = getRegions();
    if (regions.length === 0) return null;

    const tempPuzzle: Puzzle = {
      id: "temp",
      name: "temp",
      width: size,
      height: size,
      regions,
      solution: [], // Not needed for calculation
    };

    return calculatePuzzleNumber(tempPuzzle);
  }, [isBoardComplete, cellColors, size]);

  // Analyze solutions to find ambiguous cells when there are multiple solutions
  const solutionAnalysis: SolutionAnalysis | null = useMemo(() => {
    if (!isBoardComplete || solutionCount === null || solutionCount <= 1) return null;

    const regions = getRegions();
    if (regions.length === 0) return null;

    const tempPuzzle: Puzzle = {
      id: "temp",
      name: "temp",
      width: size,
      height: size,
      regions,
      solution: [],
    };

    const allSolutions = findAllSolutions(tempPuzzle, 50);
    return analyzeSolutions(allSolutions, size);
  }, [isBoardComplete, solutionCount, cellColors, size]);

  // Create a set of ambiguous cell keys for quick lookup
  const ambiguousCellKeys = useMemo(() => {
    if (!solutionAnalysis) return new Set<string>();
    return new Set(solutionAnalysis.ambiguousCells.map(c => `${c.row}-${c.col}`));
  }, [solutionAnalysis]);

  // Find conflicting crowns for real-time feedback
  const getConflicts = (): Set<string> => {
    const conflicts = new Set<string>();

    for (let i = 0; i < solution.length; i++) {
      for (let j = i + 1; j < solution.length; j++) {
        const a = solution[i];
        const b = solution[j];
        const sameRow = a.row === b.row;
        const sameCol = a.col === b.col;
        const rowDiff = Math.abs(a.row - b.row);
        const colDiff = Math.abs(a.col - b.col);
        const adjacent = rowDiff <= 1 && colDiff <= 1;
        const sameRegion = cellColors[a.row]?.[a.col] === cellColors[b.row]?.[b.col];

        if (sameRow || sameCol || adjacent || sameRegion) {
          conflicts.add(`${a.row}-${a.col}`);
          conflicts.add(`${b.row}-${b.col}`);
        }
      }
    }
    return conflicts;
  };

  const conflicts = mode === "solution" ? getConflicts() : new Set<string>();

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex flex-col items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-2xl font-bold bg-transparent border-b border-gray-600 focus:border-blue-500 outline-none text-center"
          placeholder="Puzzle Name"
        />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Size:</span>
          <button
            onClick={decrementSize}
            disabled={size <= 5}
            className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded transition-colors font-bold"
          >
            -
          </button>
          <input
            type="text"
            inputMode="numeric"
            value={sizeInput}
            onChange={(e) => handleSizeInputChange(e.target.value)}
            className={`w-12 px-2 py-1 bg-gray-800 border rounded text-white text-center ${
              isSizeInputValid() ? "border-gray-600" : "border-red-500 text-red-400"
            }`}
          />
          <button
            onClick={incrementSize}
            disabled={size >= 10}
            className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded transition-colors font-bold"
          >
            +
          </button>
          {!isSizeInputValid() && (
            <span className="text-red-400 text-xs">(5-10)</span>
          )}
        </div>
      </div>

      <p className="text-gray-400 text-sm max-w-xs text-center">
        Tip: Place crowns first, then paint regions around them.
      </p>

      <div className="flex gap-4 mb-2">
        <button
          onClick={() => setMode("solution")}
          className={`px-4 py-2 rounded transition-colors ${
            mode === "solution" ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
          }`}
        >
          Place Crowns
        </button>
        <button
          onClick={() => setMode("paint")}
          className={`px-4 py-2 rounded transition-colors ${
            mode === "paint" ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
          }`}
        >
          Paint Regions
        </button>
      </div>

      {mode === "paint" && (
        <>
          <p className="text-gray-400 text-sm">
            Paint regions. Each color must contain exactly one crown.
          </p>
          <div className="flex gap-2 flex-wrap justify-center max-w-xs">
            {COLORS.map((color, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedColor(idx)}
                className={`w-8 h-8 rounded border-2 transition-all ${
                  selectedColor === idx ? "border-white scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </>
      )}

      {mode === "solution" && (
        <p className="text-gray-400 text-sm">
          Click to place crowns. No two crowns in same row, column, or touching.
        </p>
      )}

      <div
        className="grid gap-0 border-2 border-gray-600"
        style={{
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          width: `${size * 48}px`,
        }}
      >
        {Array.from({ length: size }).map((_, row) =>
          Array.from({ length: size }).map((_, col) => {
            const colorIdx = cellColors[row]?.[col];
            const bgColor = colorIdx !== null && colorIdx !== undefined ? COLORS[colorIdx] : "#374151";
            const hasCrown = solution.some((s) => s.row === row && s.col === col);
            const hasConflict = conflicts.has(`${row}-${col}`);
            const isAmbiguous = showHints && ambiguousCellKeys.has(`${row}-${col}`);
            const crownFreq = solutionAnalysis?.crownFrequency.get(`${row}-${col}`) || 0;
            const freqPercent = solutionCount && solutionCount > 1 ? Math.round((crownFreq / solutionCount) * 100) : 0;

            return (
              <button
                key={`${row}-${col}`}
                onClick={() => handleCellClick(row, col)}
                className={`aspect-square w-full flex items-center justify-center transition-all hover:brightness-110 ${
                  hasConflict ? "border-red-500 border-2 border-solid" : isAmbiguous ? "border-yellow-400 border-2 border-dashed" : "border border-gray-700/50"
                }`}
                style={{ backgroundColor: bgColor }}
                title={isAmbiguous ? `Crown in ${freqPercent}% of solutions` : undefined}
              >
                {hasCrown && (
                  <Crown
                    className={`w-3/4 h-3/4 drop-shadow-md ${
                      hasConflict ? "text-red-900" : "text-gray-900"
                    }`}
                  />
                )}
              </button>
            );
          })
        )}
      </div>

      <div className="text-sm text-gray-400">
        Crowns: {solution.length} | Colors used: {regionCount}
        {regionCount > 0 && solution.length !== regionCount && (
          <span className="text-yellow-400 ml-2">
            (need {solution.length} colors for {solution.length} crowns)
          </span>
        )}
      </div>

      {isBoardComplete && solutionCount !== null && (
        <div className="flex flex-col items-center gap-2">
          <div className={`text-sm font-medium ${solutionCount === 1 ? "text-green-400" : solutionCount === 0 ? "text-red-400" : "text-yellow-400"}`}>
            Solutions: {solutionCount}
            {solutionCount === 0 && " (no valid solution exists)"}
            {solutionCount === 1 && " (unique solution)"}
            {solutionCount > 1 && " (multiple solutions)"}
          </div>

          {solutionCount > 1 && solutionAnalysis && (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setShowHints(!showHints)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  showHints ? "bg-yellow-600 hover:bg-yellow-500" : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                {showHints ? "Hide Hints" : "Show Hints"}
              </button>

              {showHints && (
                <div className="text-xs text-gray-300 max-w-sm text-center bg-gray-800 p-3 rounded">
                  <p className="font-medium text-yellow-400 mb-2">Cells highlighted with dashed borders are ambiguous</p>
                  <p className="mb-2">These cells have crowns in some solutions but not others. To reduce solutions:</p>
                  <ul className="text-left list-disc list-inside space-y-1">
                    <li><span className="text-cyan-400">Merge regions:</span> Paint two ambiguous cells the same color to force the same crown placement</li>
                    <li><span className="text-cyan-400">Split regions:</span> Give ambiguous cells different colors to eliminate some placements</li>
                  </ul>
                  <p className="mt-2 text-gray-400">
                    Fixed crowns: {solutionAnalysis.fixedCrowns.length} |
                    Ambiguous: {solutionAnalysis.ambiguousCells.length}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {conflicts.size > 0 && (
        <p className="text-red-400 text-sm">
          Conflict! Crowns cannot share row, column, color, or touch each other.
        </p>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Show validation hint when save button would be disabled */}
      {!error && conflicts.size === 0 && validatePuzzle() && (
        <p className="text-yellow-400 text-sm">{validatePuzzle()}</p>
      )}

      <div className="flex gap-2 flex-wrap justify-center">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            setCellColors(Array(size).fill(null).map(() => Array(size).fill(null)));
            setSolution([]);
            setError("");
          }}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        >
          Clear
        </button>
        <button
          onClick={autoCompletePuzzle}
          disabled={conflicts.size > 0}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 rounded transition-colors"
        >
          Auto-Complete
        </button>
        <button
          onClick={handleSave}
          disabled={saving || validatePuzzle() !== null}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 rounded transition-colors"
        >
          {saving ? "Saving..." : "Save Puzzle"}
        </button>
      </div>
    </div>
  );
}
