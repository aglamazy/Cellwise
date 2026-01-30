"use client";

import { Queen } from "./Queen";

interface CellProps {
  color: string;
  hasQueen: boolean;
  isError: boolean;
  onClick: () => void;
}

export function Cell({ color, hasQueen, isError, onClick }: CellProps) {
  return (
    <button
      onClick={onClick}
      className="aspect-square w-full flex items-center justify-center border border-gray-400 transition-all hover:brightness-110 active:brightness-90"
      style={{ backgroundColor: color }}
    >
      {hasQueen && (
        <Queen
          className={`w-3/4 h-3/4 ${
            isError ? "text-red-900" : "text-gray-900"
          } drop-shadow-md`}
        />
      )}
    </button>
  );
}
