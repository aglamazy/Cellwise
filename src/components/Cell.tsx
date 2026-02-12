"use client";

import { Crown } from "./Crown";
import { ExcludeMark } from "./ExcludeMark";

export type CellState = "empty" | "excluded" | "crown";

interface CellProps {
  color: string;
  state: CellState;
  isAutoExcluded: boolean;
  isError: boolean;
  isHinted: boolean;
  hintType: "cant_be" | "must_be" | null;
  onClick: () => void;
}

export function Cell({ color, state, isAutoExcluded, isError, isHinted, hintType, onClick }: CellProps) {
  const showExclude = state === "excluded" || (state === "empty" && isAutoExcluded);
  const showCrown = state === "crown";

  const hintRingClass = isHinted
    ? hintType === "cant_be"
      ? "ring-2 ring-red-400 ring-inset animate-pulse"
      : "ring-2 ring-yellow-300 ring-inset animate-pulse"
    : "";

  return (
    <button
      onClick={onClick}
      className={`aspect-square w-full flex items-center justify-center border border-gray-700/50 transition-all hover:brightness-110 active:brightness-90 ${hintRingClass}`}
      style={{ backgroundColor: color }}
    >
      {showCrown && (
        <Crown
          className={`w-3/4 h-3/4 ${
            isError ? "text-red-900" : "text-gray-900"
          } drop-shadow-md`}
        />
      )}
      {showExclude && !showCrown && (
        <ExcludeMark
          className={`w-1/2 h-1/2 ${
            state === "excluded" ? "text-gray-900/70" : "text-gray-900/30"
          }`}
        />
      )}
    </button>
  );
}
