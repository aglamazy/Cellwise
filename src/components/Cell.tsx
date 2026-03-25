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
  hintType: "error" | "cant_be" | "must_be" | null;
  autoExcludeReason: string | null;
  onClick: () => void;
}

export function Cell({ color, state, isAutoExcluded, isError, isHinted, hintType, autoExcludeReason, onClick }: CellProps) {
  const showExclude = state === "excluded" || (state === "empty" && isAutoExcluded);
  const showCrown = state === "crown";

  const hintRingClass = isHinted
    ? hintType === "error"
      ? "ring-2 ring-orange-400 ring-inset animate-pulse"
      : hintType === "cant_be"
        ? "ring-2 ring-red-400 ring-inset animate-pulse"
        : "ring-2 ring-yellow-300 ring-inset animate-pulse"
    : "";

  return (
    <button
      onClick={onClick}
      title={isAutoExcluded && !showCrown && state !== "excluded" && autoExcludeReason ? autoExcludeReason : undefined}
      className={`aspect-square w-full flex items-center justify-center border border-gray-700/30 transition-all duration-150 cursor-pointer select-none hover:brightness-115 hover:scale-[1.03] hover:z-10 active:scale-95 active:brightness-90 ${hintRingClass}`}
      style={{ backgroundColor: color }}
    >
      {showCrown && (
        <div className={`w-3/4 h-3/4 transition-transform duration-200 ${isError ? "animate-shake" : "animate-crown-pop"}`}>
          <Crown
            className={`w-full h-full ${
              isError ? "text-red-900 drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]" : "text-gray-900/90 drop-shadow-md"
            }`}
          />
        </div>
      )}
      {showExclude && !showCrown && (
        <ExcludeMark
          className={`w-1/2 h-1/2 transition-opacity duration-150 ${
            state === "excluded" ? "text-gray-900/60" : "text-gray-900/25"
          }`}
        />
      )}
    </button>
  );
}
