"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import confetti from "canvas-confetti";
import { Puzzle, Position } from "@/types/game";
import { Board } from "./Board";
import { Timer, TimerRef } from "./Timer";
import {
  validatePlacement,
  isPuzzleSolved,
  hasCrownAt,
  hasPositionIn,
  getAutoExcludedPositions,
  ValidationError,
} from "@/lib/game";

interface GameProps {
  puzzle: Puzzle;
}

interface GameState {
  crowns: Position[];
  excluded: Position[];
}

export function Game({ puzzle }: GameProps) {
  const [crowns, setCrowns] = useState<Position[]>([]);
  const [excluded, setExcluded] = useState<Position[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [solved, setSolved] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<GameState[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintedCell, setHintedCell] = useState<Position | null>(null);
  const timerRef = useRef<TimerRef>(null);

  const autoExcluded = useMemo(
    () => getAutoExcludedPositions(puzzle, crowns),
    [puzzle, crowns]
  );

  const triggerConfetti = useCallback(() => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  }, []);

  const handleCellClick = useCallback(
    (position: Position) => {
      if (solved || isPaused) return;

      // Save current state to history before making changes
      setHistory((prev) => [...prev, { crowns, excluded }]);

      const hasCrown = hasCrownAt(crowns, position);
      const isExcluded = hasPositionIn(excluded, position);

      if (hasCrown) {
        // Crown -> Empty: remove crown
        const newCrowns = crowns.filter(
          (c) => c.row !== position.row || c.col !== position.col
        );
        setCrowns(newCrowns);
        const newErrors = validatePlacement(puzzle, newCrowns);
        setErrors(newErrors);
      } else if (isExcluded) {
        // Excluded -> Crown: remove from excluded, add crown
        const newExcluded = excluded.filter(
          (p) => p.row !== position.row || p.col !== position.col
        );
        setExcluded(newExcluded);
        const newCrowns = [...crowns, position];
        setCrowns(newCrowns);
        const newErrors = validatePlacement(puzzle, newCrowns);
        setErrors(newErrors);

        if (isPuzzleSolved(puzzle, newCrowns)) {
          setSolved(true);
          timerRef.current?.stop();
          triggerConfetti();
        }
      } else {
        // Empty -> Excluded: add to excluded
        setExcluded((prev) => [...prev, position]);
      }
    },
    [puzzle, crowns, excluded, solved, isPaused, triggerConfetti]
  );

  const handleReset = () => {
    setCrowns([]);
    setExcluded([]);
    setErrors([]);
    setSolved(false);
    setHistory([]);
    setHintsUsed(0);
    setHintedCell(null);
  };

  const handlePauseToggle = () => {
    setIsPaused((prev) => !prev);
  };

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Cellwise: ${puzzle.name}`,
          text: `Try this puzzle: ${puzzle.name}`,
          url: url,
        });
      } catch {
        // User cancelled or share failed, fall back to clipboard
        await copyToClipboard(url);
      }
    } else {
      await copyToClipboard(url);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setShareMessage("Link copied!");
    } catch {
      setShareMessage("Failed to copy");
    }
  };

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;

    const previousState = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCrowns(previousState.crowns);
    setExcluded(previousState.excluded);
    const newErrors = validatePlacement(puzzle, previousState.crowns);
    setErrors(newErrors);
    setSolved(false);
  }, [history, puzzle]);

  const handleHint = useCallback(() => {
    if (solved || isPaused || !puzzle.solution) return;

    // Find a solution crown that hasn't been placed yet
    const nextHint = puzzle.solution.find(
      (solutionPos) =>
        !crowns.some(
          (c) => c.row === solutionPos.row && c.col === solutionPos.col
        )
    );

    if (!nextHint) return;

    // Save current state to history
    setHistory((prev) => [...prev, { crowns, excluded }]);

    // Remove from excluded if it was there
    const newExcluded = excluded.filter(
      (p) => p.row !== nextHint.row || p.col !== nextHint.col
    );
    setExcluded(newExcluded);

    // Place the crown
    const newCrowns = [...crowns, nextHint];
    setCrowns(newCrowns);
    setHintsUsed((prev) => prev + 1);

    // Highlight the hinted cell briefly
    setHintedCell(nextHint);

    const newErrors = validatePlacement(puzzle, newCrowns);
    setErrors(newErrors);

    if (isPuzzleSolved(puzzle, newCrowns)) {
      setSolved(true);
      timerRef.current?.stop();
      triggerConfetti();
    }
  }, [puzzle, crowns, excluded, solved, isPaused, triggerConfetti]);

  // Clear hinted cell highlight after animation
  useEffect(() => {
    if (hintedCell) {
      const timeout = setTimeout(() => setHintedCell(null), 1500);
      return () => clearTimeout(timeout);
    }
  }, [hintedCell]);

  useEffect(() => {
    if (shareMessage) {
      const timeout = setTimeout(() => setShareMessage(null), 2000);
      return () => clearTimeout(timeout);
    }
  }, [shareMessage]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">{puzzle.name}</h1>
        <p className="text-gray-400">
          Place {puzzle.regions.length} crowns. One per row, column, and color.
        </p>
        <p className="text-gray-400">Crowns cannot touch each other.</p>
      </div>

      <Timer ref={timerRef} isPaused={isPaused} onPauseToggle={handlePauseToggle} />

      <div className="relative w-full max-w-md">
        {isPaused && (
          <div
            className="absolute inset-0 bg-gray-800 bg-opacity-95 z-10 flex items-center justify-center rounded-lg cursor-pointer"
            onClick={handlePauseToggle}
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-white mb-2">Paused</p>
              <p className="text-gray-400">Click to resume</p>
            </div>
          </div>
        )}
        <Board
          puzzle={puzzle}
          crowns={crowns}
          excluded={excluded}
          autoExcluded={autoExcluded}
          errors={errors}
          hintedCell={hintedCell}
          onCellClick={handleCellClick}
        />
      </div>

      <div className="flex gap-4 items-center flex-wrap justify-center">
        <span className="text-lg">
          Crowns: {crowns.length} / {puzzle.regions.length}
        </span>
        <button
          onClick={handleUndo}
          disabled={history.length === 0}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Undo
        </button>
        <button
          onClick={handleHint}
          disabled={solved || !puzzle.solution || crowns.length >= puzzle.regions.length}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7zM9 21a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-1H9v1z" />
          </svg>
          Hint{hintsUsed > 0 ? ` (${hintsUsed})` : ""}
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        >
          Reset
        </button>
        <div className="relative">
          <button
            onClick={handleShare}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded transition-colors flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M15.75 4.5a3 3 0 11.825 2.066l-8.421 4.679a3.002 3.002 0 010 1.51l8.421 4.679a3 3 0 11-.729 1.31l-8.421-4.678a3 3 0 110-4.132l8.421-4.679a3 3 0 01-.096-.755z"
                clipRule="evenodd"
              />
            </svg>
            Share
          </button>
          {shareMessage && (
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-700 px-2 py-1 rounded text-sm whitespace-nowrap">
              {shareMessage}
            </span>
          )}
        </div>
      </div>

      {errors.length > 0 && !solved && (
        <div className="text-red-400">
          {errors.length} conflict{errors.length > 1 ? "s" : ""} detected
        </div>
      )}

      {solved && (
        <div className="text-green-400 text-2xl font-bold animate-pulse">
          Solved!
        </div>
      )}
    </div>
  );
}
