import type { DailyStreakInfo, FocusSession, MapProgressItem } from "@/types/progress";
import type { LearningMap } from "@/types/map";
import { getMapProgress, sampleMaps } from "@/data/sample-maps";

export const STORAGE_KEY_SESSIONS = "bibble-focus-sessions";
export const STORAGE_KEY_MAPS = "bibble-maps";
export const STORAGE_KEY_DELETED_MAPS = "bibble-deleted-maps";

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
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.error("Failed to load sessions from storage:", error);
    return [];
  }
}

/**
 * Save sessions array to localStorage.
 */
export function saveSessionsToStorage(sessions: FocusSession[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  } catch (error) {
    console.error("Failed to write sessions to storage:", error);
  }
}

/**
 * Record a completed focus session and notify subscribers.
 */
export function recordFocusSession(
  input: Omit<FocusSession, "id"> | { minutes: number; roomId?: string; roomName?: string; topic?: string; note?: string; completedAt?: string }
): FocusSession {
  const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const session: FocusSession = {
    id,
    minutes: Math.max(1, Math.round(input.minutes)),
    completedAt: input.completedAt || new Date().toISOString(),
    roomId: input.roomId,
    roomName: input.roomName,
    topic: input.topic,
    note: input.note,
  };

  const existing = loadSessionsFromStorage();
  const updated = [session, ...existing];
  saveSessionsToStorage(updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("bibble-focus-session-recorded", { detail: session }));
  }

  return session;
}

/**
 * Clear all focus session history from browser storage.
 */
export function clearFocusSessions(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY_SESSIONS);
    window.dispatchEvent(new CustomEvent("bibble-stats-reset"));
  } catch (error) {
    console.error("Failed to clear focus sessions:", error);
  }
}

/**
 * Merges built-in sample maps, locally stored maps, and remote maps,
 * filtering out any maps whose ID appears in deletedMapIds.
 *
 * Stored maps override matching sample maps.
 * Remote maps take precedence if present.
 * System maps and user maps in deletedMapIds are omitted entirely.
 */
export function mergeMaps(
  storedMaps: LearningMap[] = [],
  deletedMapIds: string[] = [],
  remoteMaps: LearningMap[] = []
): LearningMap[] {
  const merged = sampleMaps
    .filter((sample) => !deletedMapIds.includes(sample.id))
    .map((sample) => {
      const saved = storedMaps.find((m) => m.id === sample.id);
      return saved ?? sample;
    });

  for (const stored of storedMaps) {
    if (deletedMapIds.includes(stored.id)) continue;
    if (!merged.some((m) => m.id === stored.id)) {
      merged.push(stored);
    }
  }

  for (const remote of remoteMaps) {
    if (deletedMapIds.includes(remote.id)) continue;
    const existingIndex = merged.findIndex((map) => map.id === remote.id);
    if (existingIndex >= 0) merged[existingIndex] = remote;
    else merged.push(remote);
  }

  return merged;
}

/**
 * Computes per-map progress statistics merging sample maps and custom/stored maps,
 * excluding any maps present in deletedMapIds.
 */
export function computeMapProgressItems(
  storedMaps: LearningMap[] = [],
  deletedMapIds: string[] = [],
  remoteMaps: LearningMap[] = []
): MapProgressItem[] {
  const mergedMapList = mergeMaps(storedMaps, deletedMapIds, remoteMaps);

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
