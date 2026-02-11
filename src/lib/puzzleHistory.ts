const STORAGE_KEY = "cellwise_completed_puzzles";

function getCompletedPuzzles(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function markPuzzleCompleted(puzzleId: string): void {
  const completed = getCompletedPuzzles();
  if (!completed.includes(puzzleId)) {
    completed.push(puzzleId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
  }
}

export function isPuzzleCompleted(puzzleId: string): boolean {
  return getCompletedPuzzles().includes(puzzleId);
}

export function getCompletedPuzzleIds(): string[] {
  return getCompletedPuzzles();
}
