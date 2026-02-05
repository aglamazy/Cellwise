"use client";

import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";

export interface TimerRef {
  stop: () => void;
  getTime: () => number;
}

interface TimerProps {
  isPaused: boolean;
  onPauseToggle: () => void;
}

export const Timer = forwardRef<TimerRef, TimerProps>(function Timer(
  { isPaused, onPauseToggle },
  ref
) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isStopped, setIsStopped] = useState(false);

  useImperativeHandle(ref, () => ({
    stop: () => setIsStopped(true),
    getTime: () => elapsedTime,
  }));

  useEffect(() => {
    if (isPaused || isStopped) return;

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, isStopped]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  return (
    <div className="flex items-center gap-3">
      <span className="text-xl font-mono min-w-[60px]">{formatTime(elapsedTime)}</span>
      {!isStopped && (
        <button
          onClick={onPauseToggle}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          aria-label={isPaused ? "Resume" : "Pause"}
        >
          {isPaused ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path
                fillRule="evenodd"
                d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path
                fillRule="evenodd"
                d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      )}
    </div>
  );
});
