import type { LearningMap } from "@/types/map";
import type { MapProgressItem } from "@/types/progress";
import { sampleMaps } from "@/data/sample-maps";
import { computeMapProgressItems } from "../progress";

export interface AggregateProgressMetrics {
  totalMaps: number;
  completedMaps: number;
  inProgressMaps: number;
  notStartedMaps: number;
  totalConcepts: number;
  conceptsMastered: number;
  averageProgress: number; // 0 to 100, rounded to 1 decimal place
  categoryDistribution: Record<string, { total: number; completed: number }>;
}

export interface UserProgressResult {
  metrics: AggregateProgressMetrics;
  items: MapProgressItem[];
  isCloudSync: boolean;
  computedAt: string;
}

/**
 * Filter deleted roadmap IDs from local or cloud roadmap arrays.
 */
export function filterDeletedMaps(
  maps: LearningMap[],
  deletedIds: Set<string> | string[] = []
): LearningMap[] {
  if (!Array.isArray(maps)) return [];
  const tombstoneSet = deletedIds instanceof Set ? deletedIds : new Set(deletedIds);
  return maps.filter((m) => m && m.id && !tombstoneSet.has(m.id));
}

/**
 * Computes centralized mathematical aggregation metrics across a list of map progress items.
 */
export function computeAggregateMetrics(items: MapProgressItem[]): AggregateProgressMetrics {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      totalMaps: 0,
      completedMaps: 0,
      inProgressMaps: 0,
      notStartedMaps: 0,
      totalConcepts: 0,
      conceptsMastered: 0,
      averageProgress: 0.0,
      categoryDistribution: {},
    };
  }

  let completedMaps = 0;
  let inProgressMaps = 0;
  let notStartedMaps = 0;
  let totalConcepts = 0;
  let conceptsMastered = 0;
  let sumProgress = 0;

  const categoryDistribution: Record<string, { total: number; completed: number }> = {};

  for (const item of items) {
    if (item.status === "completed") {
      completedMaps++;
    } else if (item.status === "in-progress") {
      inProgressMaps++;
    } else {
      notStartedMaps++;
    }

    totalConcepts += item.totalBibbles || 0;
    conceptsMastered += item.completedBibbles || 0;
    sumProgress += item.progress || 0;

    const cat = item.category || "General";
    if (!categoryDistribution[cat]) {
      categoryDistribution[cat] = { total: 0, completed: 0 };
    }
    categoryDistribution[cat].total++;
    if (item.status === "completed") {
      categoryDistribution[cat].completed++;
    }
  }

  const averageProgress = Math.round((sumProgress / items.length) * 10) / 10;

  return {
    totalMaps: items.length,
    completedMaps,
    inProgressMaps,
    notStartedMaps,
    totalConcepts,
    conceptsMastered,
    averageProgress,
    categoryDistribution,
  };
}

/**
 * Resolves roadmap progress items and aggregate metrics across authenticated cloud or guest storage.
 * Strictly respects deleted map tombstones (`bibble-deleted-maps:<userId>`).
 */
export function loadUserProgressAnalytics(options: {
  userId?: string | null;
  storage?: Storage;
  storedMaps?: LearningMap[];
  deletedIds?: string[];
} = {}): UserProgressResult {
  const { userId = null, storage, storedMaps: explicitMaps, deletedIds: explicitDeleted } = options;

  let activeStoredMaps: LearningMap[] = [];
  const deletedSet = new Set<string>(explicitDeleted || []);

  if (storage) {
    // Read user-scoped or guest deleted map tombstones
    const deletedKey = userId ? `bibble-deleted-maps:${userId}` : "bibble-deleted-maps";
    try {
      const rawDeleted = storage.getItem(deletedKey);
      if (rawDeleted) {
        const parsed = JSON.parse(rawDeleted);
        if (Array.isArray(parsed)) {
          for (const id of parsed) if (typeof id === "string") deletedSet.add(id);
        }
      }
    } catch {
      // Ignore storage read error
    }

    if (!explicitMaps) {
      const mapsKey = userId ? `bibble-maps:${userId}` : "bibble-maps";
      try {
        const rawMaps = storage.getItem(mapsKey);
        if (rawMaps) {
          const parsed = JSON.parse(rawMaps);
          if (Array.isArray(parsed)) activeStoredMaps = parsed;
        }
      } catch {
        // Fall back to empty
      }
    }
  }

  if (explicitMaps) {
    activeStoredMaps = explicitMaps;
  }

  // Filter out any tombstoned maps from stored roadmaps and sample maps
  const filteredStored = filterDeletedMaps(activeStoredMaps, deletedSet);
  const filteredSamples = filterDeletedMaps(sampleMaps, deletedSet);

  // Compute map items
  const mergedMapList = filteredSamples.map((sample) => {
    const saved = filteredStored.find((m) => m.id === sample.id);
    return saved ?? sample;
  });

  for (const stored of filteredStored) {
    if (!filteredSamples.some((s) => s.id === stored.id)) {
      mergedMapList.push(stored);
    }
  }

  const items = computeMapProgressItems(mergedMapList);
  const metrics = computeAggregateMetrics(items);

  return {
    metrics,
    items,
    isCloudSync: Boolean(userId),
    computedAt: new Date().toISOString(),
  };
}
