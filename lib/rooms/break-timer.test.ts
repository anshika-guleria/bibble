import { describe, expect, it } from "vitest";
import {
  BREAK_LENGTHS,
  DEFAULT_BREAK_LENGTH,
  calculateRemainingFromDeadline,
  formatTimerSeconds,
  getTimerModeInfo,
  normalizeBreakLength,
  shouldLogToProgress,
} from "./break-timer";
import { calculateTotalMinutes } from "@/lib/progress";
import type { FocusSession } from "@/types/progress";

describe("break timer length options", () => {
  it("provides 5, 10, and 15 minutes as allowed break lengths", () => {
    expect(BREAK_LENGTHS).toEqual([5, 10, 15]);
    expect(DEFAULT_BREAK_LENGTH).toBe(5);
  });

  it("normalizes valid break choices", () => {
    expect(normalizeBreakLength(5)).toBe(5);
    expect(normalizeBreakLength(10)).toBe(10);
    expect(normalizeBreakLength(15)).toBe(15);
    expect(normalizeBreakLength("10")).toBe(10);
  });

  it("falls back to default 5 minutes for invalid choices", () => {
    expect(normalizeBreakLength(0)).toBe(5);
    expect(normalizeBreakLength(25)).toBe(5);
    expect(normalizeBreakLength(-5)).toBe(5);
    expect(normalizeBreakLength("abc")).toBe(5);
    expect(normalizeBreakLength(null)).toBe(5);
    expect(normalizeBreakLength(undefined)).toBe(5);
  });
});

describe("formatTimerSeconds", () => {
  it("formats standard minute and second values", () => {
    expect(formatTimerSeconds(300)).toBe("05:00");
    expect(formatTimerSeconds(600)).toBe("10:00");
    expect(formatTimerSeconds(900)).toBe("15:00");
    expect(formatTimerSeconds(1500)).toBe("25:00");
    expect(formatTimerSeconds(65)).toBe("01:05");
    expect(formatTimerSeconds(9)).toBe("00:09");
    expect(formatTimerSeconds(0)).toBe("00:00");
  });

  it("clamps negative values to 00:00", () => {
    expect(formatTimerSeconds(-10)).toBe("00:00");
  });
});

describe("calculateRemainingFromDeadline (background-tab drift prevention)", () => {
  it("computes exact remaining seconds from a future deadline", () => {
    const now = 1000000;
    const deadline = now + 300 * 1000; // 5 min in future
    expect(calculateRemainingFromDeadline(deadline, now)).toBe(300);
    expect(calculateRemainingFromDeadline(deadline, now + 150 * 1000)).toBe(150);
  });

  it("returns 0 when deadline has passed", () => {
    const now = 1000000;
    const deadline = now - 5000;
    expect(calculateRemainingFromDeadline(deadline, now)).toBe(0);
  });

  it("rounds up partial seconds so countdown does not skip prematurely", () => {
    const now = 1000000;
    const deadline = now + 4900; // 4.9s
    expect(calculateRemainingFromDeadline(deadline, now)).toBe(5);
  });
});

describe("getTimerModeInfo", () => {
  it("labels the state clearly as Focus when in focus mode", () => {
    const ready = getTimerModeInfo("focus", false, false, 25);
    expect(ready.label).toBe("Focus");
    expect(ready.eyebrow).toBe("Focus mode");
    expect(ready.headerText).toBe("Session goal · 25 min");
    expect(ready.statusText).toContain("Ready");

    const active = getTimerModeInfo("focus", true, false, 25);
    expect(active.label).toBe("Focus");
    expect(active.statusText).toContain("focus mode");

    const completed = getTimerModeInfo("focus", false, true, 25);
    expect(completed.label).toBe("Focus");
    expect(completed.statusText).toContain("completed");
  });

  it("labels the state clearly as Break when in break mode", () => {
    const active = getTimerModeInfo("break", true, false, 5);
    expect(active.label).toBe("Break");
    expect(active.eyebrow).toBe("Break mode");
    expect(active.headerText).toBe("Break · 5 min");
    expect(active.statusText).toContain("Enjoy your break");

    const paused = getTimerModeInfo("break", false, false, 10);
    expect(paused.label).toBe("Break");
    expect(paused.statusText).toContain("paused");
  });
});

describe("shouldLogToProgress and progress exclusion", () => {
  it("only logs to progress for focus sessions and excludes breaks", () => {
    expect(shouldLogToProgress("focus")).toBe(true);
    expect(shouldLogToProgress("break")).toBe(false);
  });

  it("progress calculation strictly sums focus minutes and ignores break time", () => {
    const focusSessions: FocusSession[] = [
      { id: "s-1", minutes: 25, completedAt: "2026-11-05T10:00:00Z", roomName: "Cozy Loft" },
      { id: "s-2", minutes: 15, completedAt: "2026-11-05T11:00:00Z", roomName: "Cozy Loft" },
    ];

    // Total progress is strictly 40 minutes (25 + 15)
    expect(calculateTotalMinutes(focusSessions)).toBe(40);
  });
});

