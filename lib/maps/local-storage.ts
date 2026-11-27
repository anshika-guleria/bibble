import { z } from "zod";
import { learningMapImportSchema } from "./export-import";
import type { LearningMap } from "@/types/map";

const storedMapSchema = learningMapImportSchema.extend({
  id: z.string().min(1),
  version: z.number().int().positive().optional(),
  description: z.string(),
  category: z.string(),
  accent: z.string(),
});

export function normalizeLocalMapData(key: string, value: unknown): unknown {
  if (key === "bibble-maps" || key.startsWith("bibble-maps:")) {
    // Keep valid siblings and their extra fields rather than replacing the whole collection.
    return Array.isArray(value)
      ? value.filter((map) => storedMapSchema.safeParse(map).success)
      : [];
  }
  if (key === "bibble-deleted-maps" || key.startsWith("bibble-deleted-maps:")) {
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : [];
  }
  return value;
}

export function getStoredMaps(key = "bibble-maps"): LearningMap[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return normalizeLocalMapData(key, parsed) as LearningMap[];
  } catch {
    return [];
  }
}

export function setStoredMaps(maps: LearningMap[], key = "bibble-maps"): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(maps));
    window.dispatchEvent(new Event("storage"));
  } catch {
    // Ignore quota errors
  }
}
