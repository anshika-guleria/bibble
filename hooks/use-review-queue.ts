"use client";

import { useCallback, useEffect, useState } from "react";
import type { DueReviewItem, ReviewRating, SpacedReviewSummary } from "@/types/review";
import type { LearningMap, Bibble } from "@/types/map";
import { sampleMaps } from "@/data/sample-maps";
import { getDueReviews } from "@/lib/reviews/queue";
import {
  getReviewIdentity,
  notifyReviewChange,
  REVIEW_CHANGE_EVENT,
  submitReviewIdempotent,
} from "@/lib/reviews/storage";
import { getStoredMaps } from "@/lib/maps/local-storage";

export function useReviewQueue() {
  const [dueItems, setDueItems] = useState<DueReviewItem[]>([]);
  const [summary, setSummary] = useState<SpacedReviewSummary>({
    dueCount: 0,
    overdueCount: 0,
    totalTrackedNodes: 0,
    nextDueAt: null,
  });
  const [activeMaps, setActiveMaps] = useState<LearningMap[]>([]);

  const loadData = useCallback(() => {
    if (typeof window === "undefined") return;

    // Load active maps: sample maps + local storage maps
    const storedMaps = getStoredMaps();
    const mapMap = new Map<string, LearningMap>();
    for (const sample of sampleMaps) mapMap.set(sample.id, sample);
    for (const stored of storedMaps) mapMap.set(stored.id, stored);
    const maps = Array.from(mapMap.values());
    setActiveMaps(maps);

    const userId = getReviewIdentity() ?? null;
    const result = getDueReviews(window.localStorage, userId, maps, { limit: 50 });
    setDueItems(result.items);
    setSummary(result.summary);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData();
    }, 0);

    const handleReviewChange = () => loadData();
    window.addEventListener(REVIEW_CHANGE_EVENT, handleReviewChange);
    window.addEventListener("storage", handleReviewChange);
    window.addEventListener("bibble-map-saved", handleReviewChange);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(REVIEW_CHANGE_EVENT, handleReviewChange);
      window.removeEventListener("storage", handleReviewChange);
      window.removeEventListener("bibble-map-saved", handleReviewChange);
    };
  }, [loadData]);

  const submitCardReview = useCallback(
    (item: DueReviewItem, rating: ReviewRating) => {
      if (typeof window === "undefined") return;
      const userId = getReviewIdentity() ?? null;
      submitReviewIdempotent(window.localStorage, userId, {
        mapId: item.mapId,
        nodeId: item.nodeId,
        nodeTitle: item.nodeTitle,
        mapTitle: item.mapTitle,
        rating,
        idempotencyKey: `${item.mapId}:${item.nodeId}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
      });
      notifyReviewChange();
    },
    [],
  );

  const getBibbleDetails = useCallback(
    (mapId: string, nodeId: string): Bibble | null => {
      const targetMap = activeMaps.find((m) => m.id === mapId);
      if (!targetMap) return null;
      return targetMap.bibbles.find((b) => b.id === nodeId) ?? null;
    },
    [activeMaps],
  );

  return {
    dueItems,
    summary,
    activeMaps,
    refresh: loadData,
    submitCardReview,
    getBibbleDetails,
  };
}
