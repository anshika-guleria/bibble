"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DailyStreakInfo, FocusSession, MapProgressItem } from "@/types/progress";
import type { LearningMap } from "@/types/map";
import { sampleMaps } from "@/data/sample-maps";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  calculateStreak,
  calculateTotalMinutes,
  clearFocusSessions,
  computeMapProgressItems,
  formatMinutes,
  loadSessionsFromStorage,
  recordFocusSession as recordSessionLib,
  STORAGE_KEY_MAPS,
} from "@/lib/progress";

export function useStudyStats() {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [storedMaps] = useLocalStorage<LearningMap[]>(STORAGE_KEY_MAPS, []);

  // Hydrate sessions from localStorage on mount
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loaded = loadSessionsFromStorage();
      setSessions(loaded);
      setHydrated(true);
    }, 0);

    const handleSessionRecorded = (e: Event) => {
      const customEvent = e as CustomEvent<FocusSession>;
      if (customEvent.detail) {
        setSessions((prev) => [customEvent.detail, ...prev.filter((s) => s.id !== customEvent.detail.id)]);
      } else {
        setSessions(loadSessionsFromStorage());
      }
    };

    const handleReset = () => {
      setSessions([]);
    };

    window.addEventListener("bibble-focus-session-recorded", handleSessionRecorded);
    window.addEventListener("bibble-stats-reset", handleReset);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("bibble-focus-session-recorded", handleSessionRecorded);
      window.removeEventListener("bibble-stats-reset", handleReset);
    };
  }, []);

  const totalMinutes = useMemo(() => calculateTotalMinutes(sessions), [sessions]);
  const formattedDuration = useMemo(() => formatMinutes(totalMinutes), [totalMinutes]);
  const streak = useMemo<DailyStreakInfo>(() => calculateStreak(sessions), [sessions]);

  // Compute map progress items combining sample maps with storedMaps
  const mapItems = useMemo<MapProgressItem[]>(() => {
    return computeMapProgressItems(storedMaps);
  }, [storedMaps]);

  const mapOverview = useMemo(() => {
    const totalMaps = mapItems.length;
    const completedMaps = mapItems.filter((m) => m.status === "completed").length;
    const inProgressMaps = mapItems.filter((m) => m.status === "in-progress").length;
    const notStartedMaps = mapItems.filter((m) => m.status === "not-started").length;
    const averageProgress = totalMaps > 0
      ? Math.round(mapItems.reduce((acc, m) => acc + m.progress, 0) / totalMaps)
      : 0;
    const totalBibbles = mapItems.reduce((acc, m) => acc + m.totalBibbles, 0);
    const completedBibbles = mapItems.reduce((acc, m) => acc + m.completedBibbles, 0);

    return {
      totalMaps,
      completedMaps,
      inProgressMaps,
      notStartedMaps,
      averageProgress,
      totalBibbles,
      completedBibbles,
    };
  }, [mapItems]);

  const personalMapCount = useMemo(
    () => storedMaps.filter((map) => !sampleMaps.some((sample) => sample.id === map.id)).length,
    [storedMaps]
  );

  const recordSession = useCallback(
    (input: {
      minutes: number;
      roomId?: string;
      roomName?: string;
      topic?: string;
      note?: string;
      completedAt?: string;
    }) => {
      // recordSessionLib persists the session and dispatches
      // "bibble-focus-session-recorded", whose listener below is the single
      // owner of session state (it de-duplicates by session id).
      return recordSessionLib(input);
    },
    []
  );

  const resetStats = useCallback(() => {
    clearFocusSessions();
    setSessions([]);
  }, []);

  return {
    sessions,
    totalMinutes,
    formattedDuration,
    streak,
    mapItems,
    mapOverview,
    personalMapCount,
    hydrated,
    recordSession,
    resetStats,
  };
}
