import { z } from "zod";
import type { Bibble, LearningMap, MapEdge, MapResource } from "@/types/map";
import { createMapId } from "./create-learning-map";
import { isValidResourceUrl } from "@/lib/resource-url";

export const MAX_MAP_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB

export const mapPositionSchema = z.object({
  x: z.number({ message: "Bibble position x coordinate must be a number" }),
  y: z.number({ message: "Bibble position y coordinate must be a number" }),
});

export const mapResourceSchema = z.object({
  id: z.string().min(1, "Resource id is required"),
  label: z.string().min(1, "Resource label is required"),
  url: z
    .string()
    .min(1, "Resource url is required")
    .refine((val) => isValidResourceUrl(val), {
      message: "Resource url must be a valid http or https link",
    }),
});

export const bibbleStatusSchema = z.enum(["not-started", "learning", "completed"], {
  message: "Bibble status must be 'not-started', 'learning', or 'completed'",
});

export const bibbleSchema = z.object({
  id: z.string().min(1, "Bibble id is required"),
  title: z.string().min(1, "Bibble title is required"),
  description: z.string().optional(),
  status: bibbleStatusSchema,
  progress: z
    .number({ message: "Bibble progress must be a number" })
    .min(0, "Bibble progress cannot be negative")
    .max(100, "Bibble progress cannot exceed 100"),
  position: mapPositionSchema,
  resources: z.array(mapResourceSchema).optional(),
  notes: z.string().optional(),
});

export const mapEdgeSchema = z.object({
  id: z.string().min(1, "Edge id is required"),
  source: z.string().min(1, "Edge source id is required"),
  target: z.string().min(1, "Edge target id is required"),
});

export const learningMapImportSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Map title is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  bibbles: z.array(bibbleSchema, {
    message: "Map must contain a bibbles array",
  }),
  edges: z.array(mapEdgeSchema, {
    message: "Map must contain an edges array",
  }),
  accent: z.string().optional(),
});

export type LearningMapImportInput = z.infer<typeof learningMapImportSchema>;

/**
 * Generate a safe export filename for a map ending in .bibble.json.
 */
export function getMapExportFilename(title?: string): string {
  const clean = (title || "")
    .trim()
    .toLowerCase()
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_\u00C0-\u024F\u1E00-\u1EFF\u0400-\u04FF\u3040-\u30FF\u4E00-\u9FFF-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${clean || "map"}.bibble.json`;
}

/**
 * Downloads a .bibble.json file containing the map data.
 */
export function exportMapAsBibbleJson(map: LearningMap): void {
  const filename = getMapExportFilename(map.title);
  const json = JSON.stringify(map, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validates a file's metadata (size and extension) before reading.
 */
export function validateMapFile(file: { name: string; size: number }): { valid: true } | { valid: false; error: string } {
  if (file.size === 0) {
    return { valid: false, error: "The selected file is empty." };
  }

  if (file.size > MAX_MAP_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: "This file is too large to import (maximum size is 1 MB). Please choose a valid map file.",
    };
  }

  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith(".json")) {
    return {
      valid: false,
      error: "Please select a valid map file (ending in .bibble.json or .json).",
    };
  }

  return { valid: true };
}

/**
 * Validates parsed JSON against the Map, Bibble, and MapEdge schemas.
 */
export function validateMapData(data: unknown):
  | { success: true; data: LearningMapImportInput }
  | { success: false; error: string } {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {
      success: false,
      error: "The file must contain a JSON object representing a learning map.",
    };
  }

  const result = learningMapImportSchema.safeParse(data);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path.join(".");
    const message = firstIssue?.message || "Invalid map structure";
    const errorDetail = path ? `${message} at "${path}"` : message;
    return {
      success: false,
      error: `Invalid map file: ${errorDetail}.`,
    };
  }

  return { success: true, data: result.data };
}

/**
 * Generates a unique fresh ID for the imported map that doesn't conflict with existing map IDs.
 */
export function createFreshMapId(title: string, existingIds: string[] = []): string {
  let candidate = createMapId(title);
  while (existingIds.includes(candidate)) {
    candidate = `${createMapId(title)}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return candidate;
}

/**
 * Prepares an imported map for saving:
 * - Assigns a fresh ID
 * - Drops edges whose source or target is missing from the bibbles array
 */
export function createImportedMap(
  data: LearningMapImportInput | LearningMap,
  existingIds: string[] = []
): LearningMap {
  const freshId = createFreshMapId(data.title, existingIds);
  const bibbleIdSet = new Set(data.bibbles.map((bibble) => bibble.id));

  // Drop edges whose source or target is missing from bibbles
  const validEdges: MapEdge[] = data.edges.filter(
    (edge) => bibbleIdSet.has(edge.source) && bibbleIdSet.has(edge.target)
  );

  return {
    id: freshId,
    title: data.title.trim(),
    description: (data.description || "").trim(),
    category: (data.category || "Personal growth").trim() || "Personal growth",
    accent: data.accent || "lavender",
    bibbles: data.bibbles.map((bibble): Bibble => ({
      id: bibble.id,
      title: bibble.title,
      description: bibble.description,
      status: bibble.status,
      progress: bibble.progress,
      position: { ...bibble.position },
      resources: bibble.resources
        ? bibble.resources
            .filter((r) => isValidResourceUrl(r.url))
            .map((r): MapResource => ({ ...r, label: r.label.trim(), url: r.url.trim() }))
        : [],
      notes: bibble.notes,
    })),
    edges: validEdges.map((edge): MapEdge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    })),
  };
}

/**
 * Full parsing and validation of a raw JSON string into a new LearningMap.
 */
export function parseAndValidateMapJson(
  jsonText: string,
  existingIds: string[] = []
): { success: true; map: LearningMap } | { success: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    return { success: false, error: "Could not parse file. It is not valid JSON." };
  }

  const validation = validateMapData(raw);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const map = createImportedMap(validation.data, existingIds);
  return { success: true, map };
}
