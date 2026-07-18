"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { Puzzle, Position } from "@/types/game";
import { Board } from "./Board";
import { Timer, TimerRef } from "./Timer";
import { useAuth } from "@/contexts/AuthContext";
import {
  validatePlacement,
  isPuzzleSolved,
  hasCrownAt,
  hasPositionIn,
  getAutoExcludedPositions,
  getAutoExcludedPositionsWithReasons,
  generateHint,
  ValidationError,
} from "@/lib/game";
import { markPuzzleCompleted } from "@/lib/puzzleHistory";

interface GameProps {
  puzzle: Puzzle;
}

interface GameState {
  crowns: Position[];
  excluded: Position[];
}

interface LeaderboardEntry {
  timeSeconds: number;
  userName: string;
  userId: string;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function Game({ puzzle }: GameProps) {
  const [crowns, setCrowns] = useState<Position[]>([]);
  const [excluded, setExcluded] = useState<Position[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [solved, setSolved] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<GameState[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintedCell, setHintedCell] = useState<Position | null>(null);
  const [hintType, setHintType] = useState<"error" | "cant_be" | "must_be" | null>(null);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const timerRef = useRef<TimerRef>(null);
  const { user, isAdmin } = useAuth();

  const canEdit = user && (puzzle.userId === user.id || isAdmin);

  const autoExcluded = useMemo(
    () => getAutoExcludedPositions(puzzle, crowns),
    [puzzle, crowns]
  );

  // Fetch leaderboard on mount
  useEffect(() => {
    fetch(`/api/results?puzzleId=${puzzle.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLeaderboard(data);
        }
      })
      .catch(() => {});
  }, [puzzle.id]);

  const saveResult = useCallback(
    async (timeSeconds: number) => {
      if (!user) return;

      try {
        const response = await fetch("/api/results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ puzzleId: puzzle.id, timeSeconds }),
        });

        const data = await response.json();

        if (data.success) {
          if (data.improved) {
            setSaveMessage(
              `New best time! ${formatTime(data.newTime)} (was ${formatTime(data.previousTime)})`
            );
          } else if (data.isNewRecord) {
            setSaveMessage(`Time saved: ${formatTime(timeSeconds)}`);
          } else {
            setSaveMessage(`Your best: ${formatTime(data.bestTime)}`);
          }

          // Refresh leaderboard
          const leaderboardRes = await fetch(
            `/api/results?puzzleId=${puzzle.id}`
          );
          const leaderboardData = await leaderboardRes.json();
          if (Array.isArray(leaderboardData)) {
            setLeaderboard(leaderboardData);
          }
        }
      } catch {
        // Silent fail for result saving
      }
    },
    [user, puzzle.id]
  );

  const autoExclusions = useMemo(
    () => getAutoExcludedPositionsWithReasons(puzzle, crowns),
    [puzzle, crowns]
  );

  const [wrongExclusionMsg, setWrongExclusionMsg] = useState<string | null>(null);

  const clearHint = useCallback(() => {
    setHintedCell(null);
    setHintType(null);
    setHintMessage(null);
  }, []);


  const triggerConfetti = useCallback(() => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 100,
    };

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

      // Clear any active hint or wrong-exclusion warning when user acts
      clearHint();
      setWrongExclusionMsg(null);

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
          markPuzzleCompleted(puzzle.id);
          timerRef.current?.stop();
          triggerConfetti();

          // Save result
          const timeSeconds = timerRef.current?.getTime() || 0;
          saveResult(timeSeconds);
        }
      } else {
        // Empty -> Excluded: add to excluded
        setExcluded((prev) => [...prev, position]);

        // Warn if the user excluded a cell that is actually in the solution
        if (puzzle.solution) {
          const isInSolution = puzzle.solution.some(
            (s) => s.row === position.row && s.col === position.col
          );
          if (isInSolution) {
            setWrongExclusionMsg(
              "This cell actually needs a crown — your exclusion is incorrect!"
            );
          }
        }
      }
    },
    [puzzle, crowns, excluded, solved, isPaused, triggerConfetti, saveResult, clearHint]
  );

  const handleReset = () => {
    setCrowns([]);
    setExcluded([]);
    setErrors([]);
    setSolved(false);
    setHistory([]);
    setSaveMessage(null);
    setHintsUsed(0);
    setHintedCell(null);
    setHintType(null);
    setHintMessage(null);
    setWrongExclusionMsg(null);
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

    clearHint();

    const previousState = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCrowns(previousState.crowns);
    setExcluded(previousState.excluded);
    const newErrors = validatePlacement(puzzle, previousState.crowns);
    setErrors(newErrors);
    setSolved(false);
  }, [history, puzzle, clearHint]);

  const handleHint = useCallback(() => {
    if (solved || isPaused) return;

    const hint = generateHint(puzzle, crowns, excluded);
    if (!hint) return;

    setHintsUsed((prev) => prev + 1);
    setHintedCell(hint.position);
    setHintType(hint.type);
    setHintMessage(hint.reason);

    if (hint.type === "cant_be") {
      // Save current state to history
      setHistory((prev) => [...prev, { crowns, excluded }]);

      // Mark the cell as excluded if not already
      const alreadyExcluded = excluded.some(
        (p) => p.row === hint.position.row && p.col === hint.position.col
      );
      if (!alreadyExcluded) {
        setExcluded((prev) => [...prev, hint.position]);
      }
    }
    // For "error" and "must_be": just highlight the cell, let the player act
  }, [puzzle, crowns, excluded, solved, isPaused]);

  useEffect(() => {
    if (shareMessage) {
      const timeout = setTimeout(() => setShareMessage(null), 2000);
      return () => clearTimeout(timeout);
    }
  }, [shareMessage]);

  const userBestTime = leaderboard.find((e) => e.userId === user?.id);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">{puzzle.name}</h1>
        <div className="flex items-center justify-center gap-2 mb-1">
          {puzzle.creatorName && (
            <span className="text-gray-500 text-sm">by {puzzle.creatorName}</span>
          )}
          {canEdit && (
            <Link
              href={`/edit/${puzzle.id}`}
              className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              Edit
            </Link>
          )}
        </div>
        <p className="text-gray-400 text-sm">
          Place {puzzle.regions.length} crowns. One per row, column, and color.
          <br />
          Crowns cannot touch each other.
        </p>
        {userBestTime && !solved && (
          <p className="text-blue-400 text-sm mt-1.5">
            Your best: {formatTime(userBestTime.timeSeconds)}
          </p>
        )}
      </div>

      <Timer
        ref={timerRef}
        isPaused={isPaused}
        onPauseToggle={handlePauseToggle}
      />

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
          autoExclusions={autoExclusions}
          errors={errors}
          hintedCell={hintedCell}
          hintType={hintType}
          onCellClick={handleCellClick}
        />
      </div>

      <div className="flex gap-3 items-center flex-wrap justify-center">
        <span className="text-sm font-medium text-gray-300 tabular-nums">
          {crowns.length} / {puzzle.regions.length}
        </span>
        <button
          onClick={handleUndo}
          disabled={history.length === 0}
          className="px-3 py-1.5 text-sm bg-gray-700/80 hover:bg-gray-600 rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Undo
        </button>
        <button
          onClick={handleHint}
          disabled={solved || crowns.length >= puzzle.regions.length}
          className="px-3 py-1.5 text-sm bg-amber-600/90 hover:bg-amber-500 rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-3.5 h-3.5"
          >
            <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7zM9 21a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-1H9v1z" />
          </svg>
          Hint
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 text-sm bg-gray-700/80 hover:bg-gray-600 rounded-md transition-all"
        >
          Reset
        </button>
        <div className="relative">
          <button
            onClick={handleShare}
            className="px-3 py-1.5 text-sm bg-blue-600/90 hover:bg-blue-500 rounded-md transition-all flex items-center gap-1.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-3.5 h-3.5"
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
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-700 px-2 py-1 rounded text-xs whitespace-nowrap">
              {shareMessage}
            </span>
          )}
        </div>
      </div>

      {hintMessage && (
        <div
          className={`text-sm px-4 py-2.5 rounded-lg max-w-md text-center transition-all flex items-center gap-2 ${
            hintType === "error"
              ? "bg-orange-950/50 text-orange-200 border border-orange-800/40"
              : hintType === "cant_be"
                ? "bg-red-950/50 text-red-200 border border-red-800/40"
                : "bg-amber-950/50 text-amber-200 border border-amber-800/40"
          }`}
        >
          <span className="flex-1 leading-snug">{hintMessage}</span>
          <button
            onClick={clearHint}
            className="ml-2 opacity-50 hover:opacity-100 transition-opacity shrink-0"
            aria-label="Dismiss hint"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      )}

      {wrongExclusionMsg && (
        <div className="text-sm px-4 py-2.5 rounded-lg max-w-md text-center transition-all flex items-center gap-2 bg-orange-950/50 text-orange-200 border border-orange-800/40">
          <span className="flex-1 leading-snug">{wrongExclusionMsg}</span>
          <button
            onClick={() => setWrongExclusionMsg(null)}
            className="ml-2 opacity-50 hover:opacity-100 transition-opacity shrink-0"
            aria-label="Dismiss warning"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      )}

      {errors.length > 0 && !solved && (
        <div className="text-red-400 text-sm font-medium">
          {errors.length} conflict{errors.length > 1 ? "s" : ""} detected
        </div>
      )}

      {solved && (
        <div className="text-center">
          <div className="text-emerald-400 text-xl font-semibold mb-1">
            Puzzle Complete!
          </div>
          {hintsUsed > 0 && (
            <p className="text-gray-500 text-sm">
              {hintsUsed} hint{hintsUsed !== 1 ? "s" : ""} used
            </p>
          )}
          {saveMessage && <p className="text-blue-400 text-sm">{saveMessage}</p>}
          {!user && (
            <p className="text-gray-500 text-sm mt-1">
              Log in to save your times
            </p>
          )}
        </div>
      )}

      {leaderboard.length > 0 && (
        <div className="mt-2 w-full max-w-sm">
          <h3 className="text-sm font-medium text-gray-400 mb-2 text-center uppercase tracking-wide">
            Leaderboard
          </h3>
          <div className="bg-gray-800/60 rounded-lg overflow-hidden border border-gray-700/40">
            {leaderboard.slice(0, 5).map((entry, index) => (
              <div
                key={entry.userId}
                className={`flex justify-between px-4 py-2 text-sm ${
                  index % 2 === 0 ? "bg-transparent" : "bg-gray-800/40"
                } ${entry.userId === user?.id ? "text-blue-400" : "text-gray-300"}`}
              >
                <span>
                  {index + 1}. {entry.userName}
                  {entry.userId === user?.id && " (you)"}
                </span>
                <span className="font-mono tabular-nums">{formatTime(entry.timeSeconds)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
