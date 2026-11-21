import { describe, expect, it } from "vitest";
import { sampleMaps } from "@/data/sample-maps";
import { normalizeLocalMapData } from "./local-storage";

describe("map storage hydration", () => {
  it("preserves valid revision tokens and filters corrupt tokens in scoped caches", () => {
    const map = { ...sampleMaps[0], version: 3 };
    expect(normalizeLocalMapData("bibble-maps:account-a", [map, { ...map, version: "3" }])).toEqual([map]);
    expect(normalizeLocalMapData("bibble-maps:guest", [map, { ...map, version: 0 }])).toEqual([map]);
    expect(normalizeLocalMapData("bibble-deleted-maps:account-a", ["map-a", null])).toEqual(["map-a"]);
  });
  it("keeps every valid sample map and its saved values intact", () => {
    const maps = structuredClone(sampleMaps);
    maps[0].title = "My saved title";
    expect(normalizeLocalMapData("bibble-maps", maps)).toEqual(maps);
    expect((normalizeLocalMapData("bibble-maps", maps) as unknown[])[0]).toBe(maps[0]);
  });

  it("falls back to an empty collection for incompatible top-level values", () => {
    for (const value of [null, { legacy: true }, true, 42, "saved maps"]) {
      expect(normalizeLocalMapData("bibble-maps", value)).toEqual([]);
      expect(normalizeLocalMapData("bibble-deleted-maps", value)).toEqual([]);
    }
  });

  it("retains valid siblings and additional saved fields without mutating the input", () => {
    const saved = { ...structuredClone(sampleMaps[0]), customMetadata: { note: "keep me" } };
    const maps = [null, saved, { legacy: true }, false];
    const before = structuredClone(maps);
    expect(normalizeLocalMapData("bibble-maps", maps)).toEqual([saved]);
    expect(maps).toEqual(before);
  });

  it("rejects incomplete map records before array consumers see them", () => {
    const map = sampleMaps[0];
    for (const patch of [{ id: "" }, { title: null }, { description: {} }, { category: null }, { accent: 3 }, { bibbles: null }, { edges: {} }]) {
      expect(normalizeLocalMapData("bibble-maps", [{ ...map, ...patch }, map])).toEqual([map]);
    }
  });

  it("reuses the import schema to reject malformed nested nodes, resources and edges", () => {
    const map = sampleMaps.find((entry) => entry.bibbles.length > 0)!;
    for (const patch of [{ status: "unknown" }, { progress: "50" }, { progress: 101 }, { position: { x: null, y: 0 } }, { resources: [{ id: "r" }] }, { notes: {} }]) {
      expect(normalizeLocalMapData("bibble-maps", [{ ...map, bibbles: [{ ...map.bibbles[0], ...patch }] }])).toEqual([]);
    }
    expect(normalizeLocalMapData("bibble-maps", [{ ...map, edges: [{ id: "edge", source: null, target: "node" }] }])).toEqual([]);
  });

  it("accepts an empty valid map without requiring imported-only defaults", () => {
    const map = { id: "personal", title: "Empty map", description: "", category: "", accent: "", bibbles: [], edges: [] };
    expect(normalizeLocalMapData("bibble-maps", [map])).toEqual([map]);
  });

  it("keeps only usable string deletion IDs without rewriting identifiers", () => {
    const value = ["sample-a", null, 12, {}, "", "   ", "Map-B", "sample-a"];
    expect(normalizeLocalMapData("bibble-deleted-maps", value)).toEqual(["sample-a", "Map-B", "sample-a"]);
    expect(value).toHaveLength(8);
  });

  it("leaves unrelated storage types to their existing consumers", () => {
    const profile = { name: "Guest" };
    expect(normalizeLocalMapData("bibble-profile", profile)).toBe(profile);
    expect(normalizeLocalMapData("bibble-timer-notifications", false)).toBe(false);
    expect(normalizeLocalMapData("bibble-theme", "lavender")).toBe("lavender");
  });
});
