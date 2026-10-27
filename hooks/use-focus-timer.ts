"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useFocusTimer(initialMinutes = 25, onComplete?: () => void) {
  const [seconds, setSeconds] = useState(initialMinutes * 60);
  const [active, setActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const endAtRef = useRef<number | null>(null);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const [prevInitialMinutes, setPrevInitialMinutes] = useState(initialMinutes);
  if (prevInitialMinutes !== initialMinutes) {
    setPrevInitialMinutes(initialMinutes);
    if (!active && !isCompleted) {
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
      const remaining = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setSeconds(remaining);

      if (remaining === 0) {
        // Clear before notifying so another tick cannot complete this run twice.
        endAtRef.current = null;
        setActive(false);
        setIsCompleted(true);
        onCompleteRef.current?.();
      }
    };

    const timer = window.setInterval(updateRemainingTime, 1000);
    document.addEventListener("visibilitychange", updateRemainingTime);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", updateRemainingTime);
    };
  }, [active, seconds]);

  const minutesStr = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secondsStr = (seconds % 60).toString().padStart(2, "0");

  const formattedTime = `${minutesStr}:${secondsStr}`;

  const toggleTimer = useCallback(() => {
    if (isCompleted) {
      // If completed (naturally or early) and restarted, reset back to full duration
      setSeconds(initialMinutes * 60);
      endAtRef.current = null;
      setIsCompleted(false);
      setActive(true);
      return;
    }
    if (active && endAtRef.current !== null) {
      setSeconds(Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000)));
      endAtRef.current = null;
    }
    setActive((prev) => !prev);
  }, [active, initialMinutes, isCompleted]);

  // Stop the clock and mark the run as done, for finishing before the countdown hits zero.
  const completeTimer = useCallback(() => {
    if (active && endAtRef.current !== null) {
      setSeconds(Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000)));
    }
    endAtRef.current = null;
    setActive(false);
    setIsCompleted(true);
  }, [active]);

  const resetTimer = useCallback(() => {
    endAtRef.current = null;
    setActive(false);
    setIsCompleted(false);
    setSeconds(initialMinutes * 60);
  }, [initialMinutes]);

  return {
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
  };
}
