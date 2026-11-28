import { describe, it, expect } from "vitest";
import {
  computeAggregateMetrics,
  filterDeletedMaps,
  loadUserProgressAnalytics,
} from "./analytics";
import type { MapProgressItem } from "@/types/progress";
import type { LearningMap } from "@/types/map";

function createMockMap(id: string, title: string, progress: number, completedCount: number, totalCount: number): LearningMap {
  const bibbles = Array.from({ length: totalCount }, (_, i) => ({
    id: `node-${i + 1}`,
    title: `Concept ${i + 1}`,
    description: "Concept description",
    category: "Architecture",
    status: i < completedCount ? ("completed" as const) : ("not-started" as const),
    progress: i < completedCount ? 100 : 0,
    position: { x: 0, y: i * 100 },
  }));

  return {
    id,
    title,
    description: "Map description",
    category: "Architecture",
    accent: "lavender",
    bibbles,
    edges: [],
  };
}

describe("Progress Analytics Engine (Issue #157)", () => {
  describe("computeAggregateMetrics", () => {
    it("handles empty items array gracefully with 0 totals", () => {
      const metrics = computeAggregateMetrics([]);
      expect(metrics.totalMaps).toBe(0);
      expect(metrics.completedMaps).toBe(0);
      expect(metrics.averageProgress).toBe(0);
      expect(metrics.totalConcepts).toBe(0);
      expect(metrics.conceptsMastered).toBe(0);
    });

    it("calculates accurate aggregate metrics across varied progress items", () => {
      const items: MapProgressItem[] = [
        {
          id: "map-1",
          title: "Frontend Roadmap",
          description: "Frontend tracks",
          category: "Web Dev",
          accent: "lavender",
          progress: 100,
          totalBibbles: 10,
          completedBibbles: 10,
          inProgressBibbles: 0,
          notStartedBibbles: 0,
          status: "completed",
        },
        {
          id: "map-2",
          title: "Backend Roadmap",
          description: "Backend tracks",
          category: "Web Dev",
          accent: "lavender",
          progress: 50,
          totalBibbles: 10,
          completedBibbles: 5,
          inProgressBibbles: 3,
          notStartedBibbles: 2,
          status: "in-progress",
        },
        {
          id: "map-3",
          title: "AI Engineering",
          description: "AI tracks",
          category: "AI",
          accent: "lavender",
          progress: 0,
          totalBibbles: 8,
          completedBibbles: 0,
          inProgressBibbles: 0,
          notStartedBibbles: 8,
          status: "not-started",
        },
      ];

      const metrics = computeAggregateMetrics(items);
      expect(metrics.totalMaps).toBe(3);
      expect(metrics.completedMaps).toBe(1);
      expect(metrics.inProgressMaps).toBe(1);
      expect(metrics.notStartedMaps).toBe(1);
      expect(metrics.totalConcepts).toBe(28);
      expect(metrics.conceptsMastered).toBe(15);
      expect(metrics.averageProgress).toBe(50.0); // (100 + 50 + 0) / 3 = 50.0
      expect(metrics.categoryDistribution["Web Dev"]).toEqual({ total: 2, completed: 1 });
      expect(metrics.categoryDistribution["AI"]).toEqual({ total: 1, completed: 0 });
    });
  });

  describe("filterDeletedMaps", () => {
    it("excludes tombstones from list of roadmaps", () => {
      const maps = [
        createMockMap("map-a", "Active Map A", 0, 0, 5),
        createMockMap("map-b", "Deleted Map B", 0, 0, 5),
        createMockMap("map-c", "Active Map C", 100, 5, 5),
      ];

      const filtered = filterDeletedMaps(maps, ["map-b"]);
      expect(filtered.map((m) => m.id)).toEqual(["map-a", "map-c"]);
    });

    it("handles empty or invalid inputs cleanly", () => {
      expect(filterDeletedMaps([], [])).toEqual([]);
      expect(filterDeletedMaps(null as unknown as LearningMap[], [])).toEqual([]);
    });
  });

  describe("loadUserProgressAnalytics", () => {
    it("resolves progress with tombstone filtering and dual-source awareness", () => {
      const mockStorage = {
        store: {} as Record<string, string>,
        getItem(key: string) {
          return this.store[key] || null;
        },
        setItem(key: string, value: string) {
          this.store[key] = value;
        },
      };

      // Set user-scoped deleted maps tombstone
      mockStorage.setItem("bibble-deleted-maps:user-42", JSON.stringify(["sample-distributed-systems"]));

      const customMap = createMockMap("custom-map-1", "Cloud Microservices", 100, 4, 4);

      const result = loadUserProgressAnalytics({
        userId: "user-42",
        storage: mockStorage as unknown as Storage,
        storedMaps: [customMap],
      });

      expect(result.isCloudSync).toBe(true);
      expect(result.items.some((i) => i.id === "sample-distributed-systems")).toBe(false);
      expect(result.items.some((i) => i.id === "custom-map-1")).toBe(true);
      expect(result.metrics.completedMaps).toBeGreaterThanOrEqual(1);
    });
  });
});
