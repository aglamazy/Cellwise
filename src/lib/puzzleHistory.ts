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

// --- useSyncExternalStore adapters -----------------------------------------
// getCompletedPuzzles() builds a fresh array on every call, which would make
// useSyncExternalStore re-render forever. These cache the parsed value and only
// hand back a new reference when the stored string actually changes.

const EMPTY: string[] = [];
let cachedRaw: string | null = null;
let cachedIds: string[] = EMPTY;

export function getCompletedPuzzlesSnapshot(): string[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedIds = getCompletedPuzzles();
  }
  return cachedIds;
}

// The server has no localStorage, so it always renders the "nothing solved yet"
// view; hydration then corrects it.
export function getCompletedPuzzlesServerSnapshot(): string[] {
  return EMPTY;
}

export function subscribeToCompletedPuzzles(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}
