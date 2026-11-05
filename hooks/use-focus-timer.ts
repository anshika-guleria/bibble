"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  calculateRemainingFromDeadline,
  DEFAULT_BREAK_LENGTH,
  normalizeBreakLength,
  type BreakLength,
  type TimerMode,
} from "@/lib/rooms/break-timer";

export function useFocusTimer(
  initialMinutes = 25,
  onComplete?: () => void,
  onBreakComplete?: () => void,
  defaultBreakMinutes: number = DEFAULT_BREAK_LENGTH
) {
  const [mode, setMode] = useState<TimerMode>("focus");
  const [breakMinutes, setBreakMinutes] = useState<BreakLength>(
    normalizeBreakLength(defaultBreakMinutes)
  );
  const [seconds, setSeconds] = useState(initialMinutes * 60);
  const [active, setActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const endAtRef = useRef<number | null>(null);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const onBreakCompleteRef = useRef(onBreakComplete);
  useEffect(() => {
    onBreakCompleteRef.current = onBreakComplete;
  }, [onBreakComplete]);

  // Sync break length when default preference changes and timer is idle
  const [prevDefaultBreakMinutes, setPrevDefaultBreakMinutes] = useState(defaultBreakMinutes);
  if (prevDefaultBreakMinutes !== defaultBreakMinutes) {
    setPrevDefaultBreakMinutes(defaultBreakMinutes);
    if (defaultBreakMinutes && !active && mode === "focus") {
      setBreakMinutes(normalizeBreakLength(defaultBreakMinutes));
    }
  }

  const [prevInitialMinutes, setPrevInitialMinutes] = useState(initialMinutes);
  if (prevInitialMinutes !== initialMinutes) {
    setPrevInitialMinutes(initialMinutes);
    if (!active && !isCompleted && mode === "focus") {
      setSeconds(initialMinutes * 60);
    }
  }

  useEffect(() => {
    if (!active) {
      endAtRef.current = null;
      return;
    }

    // Keep the same deadline across ticks, even when the browser delays them.
    endAtRef.current ??= Date.now() + seconds * 1000;
    const updateRemainingTime = () => {
      if (endAtRef.current === null) return;
      const remaining = calculateRemainingFromDeadline(endAtRef.current);
      setSeconds(remaining);

      if (remaining === 0) {
        // Clear before notifying so another tick cannot complete this run twice.
        endAtRef.current = null;
        setActive(false);
        if (mode === "focus") {
          setIsCompleted(true);
          onCompleteRef.current?.();
        } else {
          // Break finished naturally: switch back to focus ready mode
          onBreakCompleteRef.current?.();
          setMode("focus");
          setIsCompleted(false);
          setSeconds(initialMinutes * 60);
        }
      }
    };

    const timer = window.setInterval(updateRemainingTime, 1000);
    document.addEventListener("visibilitychange", updateRemainingTime);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", updateRemainingTime);
    };
  }, [active, initialMinutes, mode, seconds]);

  const minutesStr = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secondsStr = (seconds % 60).toString().padStart(2, "0");

  const formattedTime = `${minutesStr}:${secondsStr}`;

  const toggleTimer = useCallback(() => {
    if (mode === "focus" && isCompleted) {
      // If completed (naturally or early) and restarted, reset back to full duration
      setSeconds(initialMinutes * 60);
      endAtRef.current = null;
      setIsCompleted(false);
      setActive(true);
      return;
    }
    if (active && endAtRef.current !== null) {
      setSeconds(calculateRemainingFromDeadline(endAtRef.current));
      endAtRef.current = null;
    }
    setActive((prev) => !prev);
  }, [active, initialMinutes, isCompleted, mode]);

  // Stop the clock and mark the run as done, for finishing before the countdown hits zero.
  const completeTimer = useCallback(() => {
    if (active && endAtRef.current !== null) {
      setSeconds(calculateRemainingFromDeadline(endAtRef.current));
    }
    endAtRef.current = null;
    setActive(false);
    setIsCompleted(true);
  }, [active]);

  const resetTimer = useCallback(() => {
    endAtRef.current = null;
    setActive(false);
    if (mode === "break") {
      setSeconds(breakMinutes * 60);
    } else {
      setIsCompleted(false);
      setSeconds(initialMinutes * 60);
    }
  }, [breakMinutes, initialMinutes, mode]);

  const startBreak = useCallback(
    (minutes?: number) => {
      const mins = normalizeBreakLength(minutes ?? breakMinutes);
      setBreakMinutes(mins);
      setMode("break");
      setIsCompleted(false);
      setSeconds(mins * 60);
      endAtRef.current = Date.now() + mins * 60 * 1000;
      setActive(true);
    },
    [breakMinutes]
  );

  const skipBreak = useCallback(() => {
    endAtRef.current = null;
    setActive(false);
    setMode("focus");
    setIsCompleted(false);
    setSeconds(initialMinutes * 60);
  }, [initialMinutes]);

  const resetBreak = useCallback(() => {
    endAtRef.current = null;
    setActive(false);
    setSeconds(breakMinutes * 60);
  }, [breakMinutes]);

  const startFocusSession = useCallback(() => {
    endAtRef.current = Date.now() + initialMinutes * 60 * 1000;
    setMode("focus");
    setIsCompleted(false);
    setSeconds(initialMinutes * 60);
    setActive(true);
  }, [initialMinutes]);

  return {
    mode,
    setMode,
    breakMinutes,
    setBreakMinutes,
    seconds,
    active,
    formattedTime,
    minutesStr,
    secondsStr,
    toggleTimer,
    setActive,
    resetTimer,
    completeTimer,
    isCompleted,
    setIsCompleted,
    startBreak,
    skipBreak,
    resetBreak,
    startFocusSession,
  };
}
