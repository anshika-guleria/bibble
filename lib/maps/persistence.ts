import type { Bibble, LearningMap, MapEdge } from "@/types/map";
import { createClient } from "@/lib/supabase/client";
import { ConcurrencyConflictError, saveLocalMapVersioned } from "./concurrency";
import { getMapExportFilename } from "./export-import";

type MapRow = Pick<LearningMap, "id" | "title" | "description" | "category" | "accent" | "version">;
type BibbleRow = Omit<Bibble, "position"> & { map_id: string; position_x: number; position_y: number };
type EdgeRow = Pick<MapEdge, "id"> & { map_id: string; source_id: string; target_id: string };

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function mapToRows(map: LearningMap) {
  return {
    map: { id: map.id, title: map.title, description: map.description, category: map.category, accent: map.accent, ...(map.version !== undefined ? { version: map.version } : {}) },
    bibbles: map.bibbles.map((bibble) => ({
      id: bibble.id,
      map_id: map.id,
      title: bibble.title,
      description: bibble.description ?? "",
      status: bibble.status,
      progress: bibble.progress,
      position_x: bibble.position.x,
      position_y: bibble.position.y,
      resources: bibble.resources ?? [],
      notes: bibble.notes ?? "",
    })),
    edges: map.edges.map((edge) => ({ id: edge.id, map_id: map.id, source_id: edge.source, target_id: edge.target })),
  };
}

export function rowsToMap(map: MapRow, bibbles: BibbleRow[], edges: EdgeRow[]): LearningMap {
  return {
    id: map.id,
    title: map.title,
    description: map.description,
    category: map.category,
    accent: map.accent,
    ...(map.version !== undefined ? { version: map.version } : {}),
    bibbles: bibbles.map(({ id, title, description, status, progress, position_x, position_y, resources, notes }) => ({
      id,
      title,
      description,
      status,
      progress,
      position: { x: position_x, y: position_y },
      resources,
      notes,
    })),
    edges: edges.map(({ id, source_id, target_id }) => ({ id, source: source_id, target: target_id })),
  };
}

export type MapSaveResult =
  | { status: "saved"; map: LearningMap; storage: "local" | "cloud" }
  | { status: "conflict" }
  | { status: "error"; message: string };

export async function saveMapWithVersion(map: LearningMap, storageKey = "bibble-maps"): Promise<MapSaveResult> {
  try {
    const supabase = isSupabaseConfigured() ? createClient() : null;
    const auth = supabase ? await supabase.auth.getUser() : null;
    if (auth?.error && auth.error.name !== "AuthSessionMissingError") {
      return { status: "error", message: "Your session could not be verified. Your current edits are still in this tab; reconnect and retry." };
    }
    const user = auth?.data.user ?? null;
    if (!supabase || !user) return { status: "saved", map: await saveLocalMapVersioned(map, storageKey), storage: "local" };
    const rows = mapToRows(map);
    const { data, error } = await supabase.rpc("save_learning_map_versioned", {
      p_map: rows.map, p_bibbles: rows.bibbles, p_edges: rows.edges,
      p_expected_version: map.version ?? null,
    });
    if (error?.code === "PT409" || error?.message === "CONCURRENCY_CONFLICT") return { status: "conflict" };
    if (error || !Number.isSafeInteger(data) || data < 1) {
      return { status: "error", message: "Cloud save failed. Check the connection and map version migration, then retry." };
    }
    return { status: "saved", map: { ...map, version: data }, storage: "cloud" };
  } catch (error) {
    if (error instanceof ConcurrencyConflictError) return { status: "conflict" };
    return { status: "error", message: error instanceof Error ? error.message : "Could not save this map." };
  }
}

/** Compatibility helper for callers that do not offer conflict resolution. */
export async function saveMapToSupabase(map: LearningMap): Promise<boolean> {
  return (await saveMapWithVersion(map)).status === "saved";
}

export async function loadLatestMap(id: string, storageKey = "bibble-maps"): Promise<LearningMap | null> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return loadMapFromSupabase(id);
  }
  const maps: LearningMap[] = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
  const map = maps.find((m) => m.id === id);
  return map ? { ...map, version: map.version ?? 1 } : null;
}

export async function deleteMapFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return true;
    const { error } = await supabase.from("learning_maps").delete().eq("id", id);
    return !error;
  } catch {
    return false;
  }
}

export async function loadMapFromSupabase(id: string): Promise<LearningMap | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    // Fetch the revision and graph together, so the editor never pairs a
    // current version token with nodes from a different committed revision.
    const { data, error } = await supabase.from("learning_maps")
      .select("id,title,description,category,accent,version,map_bibbles(id,map_id,title,description,status,progress,position_x,position_y,resources,notes),map_edges(id,map_id,source_id,target_id)")
      .eq("id", id).maybeSingle();
    if (error || !data) return null;
    return rowsToMap(data, (data.map_bibbles as BibbleRow[]) ?? [], (data.map_edges as EdgeRow[]) ?? []);
  } catch {
    return null;
  }
}

export async function listMapsFromSupabase(): Promise<LearningMap[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    // Retain #139's single joined query while including #143's revision token.
    const { data, error } = await supabase.from("learning_maps")
      .select("id,title,description,category,accent,version,map_bibbles(id,map_id,title,description,status,progress,position_x,position_y,resources,notes),map_edges(id,map_id,source_id,target_id)")
      .order("updated_at", { ascending: false });
    if (error || !Array.isArray(data)) return [];
    return data.map((row) => rowsToMap(row, (row.map_bibbles as BibbleRow[]) ?? [], (row.map_edges as EdgeRow[]) ?? []));
  } catch {
    return [];
  }
}

export async function downloadMapExport(map: LearningMap): Promise<void> {
  const blob = new Blob([JSON.stringify(map, null, 2)], { type: "application/json" });
  try {
    const supabase = isSupabaseConfigured() ? createClient() : null;
    if (!supabase) return downloadBlob(blob, map.id);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const path = `${user.id}/${map.id}/map.json`;
      const { error } = await supabase.storage.from("map-exports").upload(path, blob, { upsert: true, contentType: "application/json" });
      if (!error) {
        const { data } = await supabase.storage.from("map-exports").createSignedUrl(path, 60);
        if (data?.signedUrl) {
          window.open(data.signedUrl, "_blank", "noopener,noreferrer");
          return;
        }
      }
    }
  } catch {
    // Fall back to a local download when Storage is unavailable.
  }

  downloadBlob(blob, map.title);
}

function downloadBlob(blob: Blob, title: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = getMapExportFilename(title);
  anchor.click();
  URL.revokeObjectURL(url);
}
