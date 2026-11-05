export const BREAK_LENGTHS = [5, 10, 15] as const;
export type BreakLength = (typeof BREAK_LENGTHS)[number];
export const DEFAULT_BREAK_LENGTH: BreakLength = 5;
export const STORAGE_KEY_PREFERRED_BREAK = "bibble-preferred-break-length";

export type TimerMode = "focus" | "break";

/**
 * Validates and normalizes break length to 5, 10, or 15 minutes.
 * Defaults to 5 minutes if invalid.
 */
export function normalizeBreakLength(val: unknown): BreakLength {
  const n = Number(val);
  if (n === 5 || n === 10 || n === 15) return n as BreakLength;
  return DEFAULT_BREAK_LENGTH;
}

/**
 * Formats total seconds into MM:SS string representation.
 */
export function formatTimerSeconds(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(clamped / 60)
    .toString()
    .padStart(2, "0");
  const secs = (clamped % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

/**
 * Computes remaining seconds from a deadline timestamp.
 * Kept accurate regardless of background tab throttling.
 */
export function calculateRemainingFromDeadline(
  deadlineTimestamp: number,
  now: number = Date.now()
): number {
  return Math.max(0, Math.ceil((deadlineTimestamp - now) / 1000));
}

/**
 * Returns labels, eyebrow, and status messages for timer state.
 */
export function getTimerModeInfo(
  mode: TimerMode,
  active: boolean,
  isCompleted: boolean,
  minutes: number
) {
  if (mode === "break") {
    return {
      label: "Break",
      eyebrow: "Break mode",
      headerText: `Break · ${minutes} min`,
      statusText: active
        ? "☕ Enjoy your break — stretch, hydrate & recharge"
        : "☕ Break paused — take your time",
    };
  }

  return {
    label: "Focus",
    eyebrow: "Focus mode",
    headerText: `Session goal · ${minutes} min`,
    statusText: isCompleted
      ? "🎉 Session completed & logged to your progress!"
      : active
      ? "✨ The room is in focus mode"
      : "Ready when you are",
  };
}

/**
 * Progress totals must only record study/focus minutes.
 * Breaks are explicitly excluded.
 */
export function shouldLogToProgress(mode: TimerMode): boolean {
  return mode === "focus";
}

