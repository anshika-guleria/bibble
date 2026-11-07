import { describe, expect, it } from "vitest";
import { sampleMaps } from "@/data/sample-maps";
import type { LearningMap } from "@/types/map";
import {
  computeMapProgressItems,
  mergeMaps,
  STORAGE_KEY_DELETED_MAPS,
  STORAGE_KEY_MAPS,
  STORAGE_KEY_SESSIONS,
} from "./progress";

describe("progress storage keys", () => {
  it("exports correct storage keys", () => {
    expect(STORAGE_KEY_SESSIONS).toBe("bibble-focus-sessions");
    expect(STORAGE_KEY_MAPS).toBe("bibble-maps");
    expect(STORAGE_KEY_DELETED_MAPS).toBe("bibble-deleted-maps");
  });
});

describe("mergeMaps", () => {
  it("returns all sample maps by default", () => {
    const result = mergeMaps();
    expect(result.length).toBe(sampleMaps.length);
    expect(result.map((m) => m.id)).toEqual(sampleMaps.map((m) => m.id));
  });

  it("filters out sample maps whose id is in deletedMapIds", () => {
    const deletedId = "dsa-roadmap";
    const result = mergeMaps([], [deletedId]);

    expect(result.length).toBe(sampleMaps.length - 1);
    expect(result.some((m) => m.id === deletedId)).toBe(false);
  });

  it("filters out multiple deleted maps", () => {
    const deletedIds = ["dsa-roadmap", "react-journey"];
    const result = mergeMaps([], deletedIds);

    expect(result.length).toBe(sampleMaps.length - 2);
    expect(result.some((m) => deletedIds.includes(m.id))).toBe(false);
  });

  it("uses stored map overrides for non-deleted sample maps", () => {
    const override: LearningMap = {
      ...sampleMaps[0],
      title: "Customized DSA Roadmap",
    };
    const result = mergeMaps([override], []);

    const found = result.find((m) => m.id === sampleMaps[0].id);
    expect(found?.title).toBe("Customized DSA Roadmap");
  });

  it("skips stored map overrides when the map id is in deletedMapIds", () => {
    const deletedId = sampleMaps[0].id;
    const override: LearningMap = {
      ...sampleMaps[0],
      title: "Customized But Deleted",
    };
    const result = mergeMaps([override], [deletedId]);

    expect(result.some((m) => m.id === deletedId)).toBe(false);
  });

  it("includes user-created custom maps from storedMaps", () => {
    const customMap: LearningMap = {
      id: "my-custom-map",
      title: "My Custom Map",
      description: "A custom test map",
      category: "Personal growth",
      accent: "lavender",
      bibbles: [],
      edges: [],
    };
    const result = mergeMaps([customMap], []);

    expect(result.length).toBe(sampleMaps.length + 1);
    expect(result.some((m) => m.id === "my-custom-map")).toBe(true);
  });

  it("skips user-created custom maps whose id is in deletedMapIds", () => {
    const customMap: LearningMap = {
      id: "my-custom-map",
      title: "My Custom Map",
      description: "A custom test map",
      category: "Personal growth",
      accent: "lavender",
      bibbles: [],
      edges: [],
    };
    const result = mergeMaps([customMap], ["my-custom-map"]);

    expect(result.some((m) => m.id === "my-custom-map")).toBe(false);
  });

  it("handles remote maps taking precedence over local ones and skips deleted remote maps", () => {
    const remoteOverride: LearningMap = {
      ...sampleMaps[1],
      title: "Remote React Journey",
    };
    const remoteCustom: LearningMap = {
      id: "remote-only-map",
      title: "Remote Only Map",
      description: "From cloud",
      category: "Frontend",
      accent: "teal",
      bibbles: [],
      edges: [],
    };
    const deletedRemote: LearningMap = {
      id: "deleted-remote-map",
      title: "Deleted Remote",
      description: "Deleted",
      category: "Frontend",
      accent: "teal",
      bibbles: [],
      edges: [],
    };

    const result = mergeMaps(
      [],
      ["deleted-remote-map"],
      [remoteOverride, remoteCustom, deletedRemote]
    );

    expect(result.find((m) => m.id === sampleMaps[1].id)?.title).toBe("Remote React Journey");
    expect(result.some((m) => m.id === "remote-only-map")).toBe(true);
    expect(result.some((m) => m.id === "deleted-remote-map")).toBe(false);
  });
});

describe("computeMapProgressItems", () => {
  it("computes progress items for all sample maps by default", () => {
    const items = computeMapProgressItems();
    expect(items.length).toBe(sampleMaps.length);
    expect(items.map((i) => i.id)).toEqual(sampleMaps.map((m) => m.id));
  });

  it("omits maps whose id is in deletedMapIds", () => {
    const deletedId = "dsa-roadmap";
    const items = computeMapProgressItems([], [deletedId]);

    expect(items.length).toBe(sampleMaps.length - 1);
    expect(items.some((i) => i.id === deletedId)).toBe(false);
  });

  it("omits stored map overrides whose id is in deletedMapIds", () => {
    const deletedId = "dsa-roadmap";
    const override: LearningMap = {
      ...sampleMaps[0],
      title: "DSA Override",
    };
    const items = computeMapProgressItems([override], [deletedId]);

    expect(items.some((i) => i.id === deletedId)).toBe(false);
  });

  it("includes user-created maps and correctly calculates status", () => {
    const customMap: LearningMap = {
      id: "custom-completed",
      title: "Custom Completed",
      description: "Done",
      category: "Computer Science",
      accent: "emerald",
      bibbles: [
        {
          id: "node-1",
          title: "Node 1",
          position: { x: 0, y: 0 },
          status: "completed",
          progress: 100,
        },
      ],
      edges: [],
    };

    const items = computeMapProgressItems([customMap], []);
    const completedItem = items.find((i) => i.id === "custom-completed");
    expect(completedItem).toBeDefined();
    expect(completedItem?.status).toBe("completed");
    expect(completedItem?.progress).toBe(100);
    expect(completedItem?.totalBibbles).toBe(1);
    expect(completedItem?.completedBibbles).toBe(1);
  });
});

