"use client";
import { FOCUS_CHANGE } from "@/lib/focus-sessions";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DailyStreakInfo, FocusSession } from "@/types/progress";
import type { LearningMap } from "@/types/map";
import { sampleMaps } from "@/data/sample-maps";
import { useMapStorage } from "@/components/auth/map-session-provider";
import {
  calculateStreak,
  calculateTotalMinutes,
  clearFocusSessions,
  formatMinutes,
  loadSessionsFromStorage,
  recordFocusSession as recordSessionLib,
  STORAGE_KEY_MAPS,
} from "@/lib/progress";
import { loadUserProgressAnalytics } from "@/lib/progress/analytics";

export function useStudyStats() {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [storedMaps] = useMapStorage<LearningMap[]>(STORAGE_KEY_MAPS, []);
  const [deletedIds] = useMapStorage<string[]>("bibble-deleted-maps", []);

  // Hydrate sessions from localStorage on mount
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loaded = loadSessionsFromStorage();
      setSessions(loaded);
      setHydrated(true);
    }, 0);

    const handleSessionRecorded = () => setSessions(loadSessionsFromStorage());

    const handleReset = () => setSessions(loadSessionsFromStorage());

    window.addEventListener("bibble-focus-session-recorded", handleSessionRecorded);
    window.addEventListener("bibble-stats-reset", handleReset);
    window.addEventListener(FOCUS_CHANGE, handleSessionRecorded);
    window.addEventListener("storage", handleSessionRecorded);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("bibble-focus-session-recorded", handleSessionRecorded);
      window.removeEventListener("bibble-stats-reset", handleReset);
      window.removeEventListener(FOCUS_CHANGE, handleSessionRecorded);
      window.removeEventListener("storage", handleSessionRecorded);
    };
  }, []);

  const totalMinutes = useMemo(() => calculateTotalMinutes(sessions), [sessions]);
  const formattedDuration = useMemo(() => formatMinutes(totalMinutes), [totalMinutes]);
  const streak = useMemo<DailyStreakInfo>(() => calculateStreak(sessions), [sessions]);

  // Compute map progress items and aggregate metrics using the analytics engine
  const analyticsResult = useMemo(() => {
    return loadUserProgressAnalytics({
      storedMaps,
      deletedIds,
    });
  }, [storedMaps, deletedIds]);

  const mapItems = analyticsResult.items;

  const mapOverview = useMemo(() => {
    return {
      totalMaps: analyticsResult.metrics.totalMaps,
      completedMaps: analyticsResult.metrics.completedMaps,
      inProgressMaps: analyticsResult.metrics.inProgressMaps,
      notStartedMaps: analyticsResult.metrics.notStartedMaps,
      averageProgress: Math.round(analyticsResult.metrics.averageProgress),
      totalBibbles: analyticsResult.metrics.totalConcepts,
      completedBibbles: analyticsResult.metrics.conceptsMastered,
    };
  }, [analyticsResult]);

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
      return recordSessionLib(input);
    },
    []
  );

  const resetStats = useCallback(() => {
    return clearFocusSessions();
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
    isCloudSync: analyticsResult.isCloudSync,
    categoryDistribution: analyticsResult.metrics.categoryDistribution,
    recordSession,
    resetStats,
  };
}
