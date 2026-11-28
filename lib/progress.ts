import {loadActiveFocusSessions,recordActiveFocusSession,resetActiveFocusHistory} from "./focus-sessions";
import type { DailyStreakInfo, FocusSession, MapProgressItem } from "@/types/progress";
import type { LearningMap } from "@/types/map";
import { getMapProgress, sampleMaps } from "@/data/sample-maps";

export const STORAGE_KEY_SESSIONS = "bibble-focus-sessions";
export const STORAGE_KEY_MAPS = "bibble-maps";

/**
 * Returns today's date formatted as YYYY-MM-DD in local timezone.
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get date string shifted by delta days from a base date.
 */
function getShiftedDateString(baseDate: Date, deltaDays: number): string {
  const target = new Date(baseDate);
  target.setDate(target.getDate() + deltaDays);
  return getLocalDateString(target);
}

/**
 * Computes daily streak information from completed sessions.
 */
export function calculateStreak(sessions: FocusSession[], referenceDate: Date = new Date()): DailyStreakInfo {
  if (!sessions || sessions.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      activeDates: [],
      studiedToday: false,
    };
  }

  // Collect unique active dates (YYYY-MM-DD)
  const dateSet = new Set<string>();
  for (const s of sessions) {
    if (!s.completedAt) continue;
    try {
      const d = new Date(s.completedAt);
      if (!isNaN(d.getTime())) {
        dateSet.add(getLocalDateString(d));
      }
    } catch {
      // Ignore invalid date format
    }
  }

  const activeDates = Array.from(dateSet).sort(); // Ascending
  if (activeDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      activeDates: [],
      studiedToday: false,
    };
  }

  const todayStr = getLocalDateString(referenceDate);
  const yesterdayStr = getShiftedDateString(referenceDate, -1);

  const studiedToday = dateSet.has(todayStr);
  const studiedYesterday = dateSet.has(yesterdayStr);

  // Calculate current streak
  let currentStreak = 0;
  if (studiedToday || studiedYesterday) {
    // Step back one calendar day at a time. Subtracting 24h in ms lands on the
    // same date twice (or skips one) on the days the clocks change.
    const checkDate = new Date(referenceDate);
    if (!studiedToday) checkDate.setDate(checkDate.getDate() - 1);
    while (dateSet.has(getLocalDateString(checkDate))) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let runningStreak = 0;
  let previousDate: Date | null = null;

  for (const dateStr of activeDates) {
    const parts = dateStr.split("-").map(Number);
    const currentDate = new Date(parts[0], parts[1] - 1, parts[2]);

    if (!previousDate) {
      runningStreak = 1;
    } else {
      const diffTime = currentDate.getTime() - previousDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        runningStreak++;
      } else if (diffDays > 1) {
        runningStreak = 1;
      }
    }

    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
    previousDate = currentDate;
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    lastActiveDate: activeDates[activeDates.length - 1] ?? null,
    activeDates,
    studiedToday,
  };
}

/**
 * Calculate total minutes from sessions.
 */
export function calculateTotalMinutes(sessions: FocusSession[]): number {
  return sessions.reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
}

/**
 * Format minutes into friendly string like "2h 15m" or "45 mins".
 */
export function formatMinutes(totalMinutes: number): { formatted: string; hours: number; mins: number } {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours === 0) {
    return { formatted: `${mins} min${mins === 1 ? "" : "s"}`, hours, mins };
  }
  if (mins === 0) {
    return { formatted: `${hours} hr${hours === 1 ? "" : "s"}`, hours, mins };
  }
  return { formatted: `${hours}h ${mins}m`, hours, mins };
}

/**
 * Safely load recorded sessions from localStorage.
 */
export function loadSessionsFromStorage(): FocusSession[] {
  return loadActiveFocusSessions();
}

export function recordFocusSession(input: { minutes:number; roomId?:string;roomName?:string;topic?:string;note?:string;completedAt?:string;id?:string }): FocusSession {
  if (!Number.isFinite(input.minutes)) throw new Error("Invalid session duration");
  const session=recordActiveFocusSession({...input,minutes:Math.max(1,Math.round(input.minutes)),completedAt:input.completedAt??new Date().toISOString()});
  window.dispatchEvent(new CustomEvent("bibble-focus-session-recorded"));
  return session;
}

export function clearFocusSessions(): Promise<void> {
  return resetActiveFocusHistory();
}

/**
 * Computes per-map progress statistics merging sample maps and custom/stored maps.
 */
export function computeMapProgressItems(storedMaps: LearningMap[] = []): MapProgressItem[] {
  // Merge sample maps with any overrides in storedMaps
  const mergedMapList = sampleMaps.map((sample) => {
    const saved = storedMaps.find((m) => m.id === sample.id);
    return saved ?? sample;
  });

  // Also include any user-created custom maps that aren't sample maps
  for (const stored of storedMaps) {
    if (!sampleMaps.some((s) => s.id === stored.id)) {
      mergedMapList.push(stored);
    }
  }

  return mergedMapList.map((map) => {
    const progress = getMapProgress(map);
    const totalBibbles = map.bibbles.length;
    const completedBibbles = map.bibbles.filter((b) => b.status === "completed" || b.progress >= 100).length;
    const inProgressBibbles = map.bibbles.filter(
      (b) => (b.status === "learning" || b.progress > 0) && b.progress < 100
    ).length;
    const notStartedBibbles = map.bibbles.filter(
      (b) => b.status === "not-started" && b.progress === 0
    ).length;

    let status: "completed" | "in-progress" | "not-started" = "not-started";
    if (progress >= 100 || (totalBibbles > 0 && completedBibbles === totalBibbles)) {
      status = "completed";
    } else if (progress > 0 || completedBibbles > 0 || inProgressBibbles > 0) {
      status = "in-progress";
    }

    return {
      id: map.id,
      title: map.title,
      description: map.description,
      category: map.category,
      accent: map.accent,
      progress,
      totalBibbles,
      completedBibbles,
      inProgressBibbles,
      notStartedBibbles,
      status,
    };
  });
}

export * from "./reviews";
export * from "./progress/analytics";

