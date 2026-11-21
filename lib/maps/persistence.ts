import type { Bibble, LearningMap, MapEdge } from "@/types/map";
import { createClient } from "@/lib/supabase/client";
import { getMapExportFilename } from "./export-import";

type MapRow = Pick<LearningMap, "id" | "title" | "description" | "category" | "accent"> & { updated_at?: string };
type BibbleRow = Omit<Bibble, "position"> & { map_id: string; position_x: number; position_y: number };
type EdgeRow = Pick<MapEdge, "id"> & { map_id: string; source_id: string; target_id: string };

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function mapToRows(map: LearningMap) {
  return {
    map: { id: map.id, title: map.title, description: map.description, category: map.category, accent: map.accent },
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
    ...(map.updated_at ? { updatedAt: map.updated_at } : {}),
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

export async function saveMapToSupabase(map: LearningMap, expectedUserId?: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return !expectedUserId;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (expectedUserId && user?.id !== expectedUserId) return false;
    if (!user) return true;

    const rows = mapToRows(map);

    // Primary path: Execute atomic transactional stored procedure in PostgreSQL
    const { data, error: rpcError } = await supabase.rpc("save_learning_map_atomic", {
      p_map: rows.map,
      p_bibbles: rows.bibbles,
      p_edges: rows.edges,
    });

    // Fail closed if the migration is absent. Separate REST writes cannot
    // preserve transaction guarantees; the editor keeps its local recovery copy.
    return !rpcError && data === true;
  } catch {
    return false;
  }
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

    // Single joined query for map, bibbles, and edges
    const { data, error } = await supabase
      .from("learning_maps")
      .select("id,title,description,category,accent,updated_at,map_bibbles(id,map_id,title,description,status,progress,position_x,position_y,resources,notes),map_edges(id,map_id,source_id,target_id)")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      return rowsToMap(
        {
          id: data.id,
          title: data.title,
          description: data.description,
          category: data.category,
          accent: data.accent,
          updated_at: data.updated_at,
        },
        (data.map_bibbles as BibbleRow[]) ?? [],
        (data.map_edges as EdgeRow[]) ?? []
      );
    }

    // Fallback to separate queries if joined query fails
    const { data: map, error: mapError } = await supabase.from("learning_maps").select("id,title,description,category,accent,updated_at").eq("id", id).maybeSingle();
    if (mapError || !map) return null;
    const [{ data: bibbles, error: bibblesError }, { data: edges, error: edgesError }] = await Promise.all([
      supabase.from("map_bibbles").select("id,map_id,title,description,status,progress,position_x,position_y,resources,notes").eq("map_id", id),
      supabase.from("map_edges").select("id,map_id,source_id,target_id").eq("map_id", id),
    ]);
    if (bibblesError || edgesError) return null;
    return rowsToMap(map, bibbles ?? [], edges ?? []);
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

    // Single query retrieving all user maps along with their nested bibbles and edges
    const { data, error } = await supabase
      .from("learning_maps")
      .select("id,title,description,category,accent,updated_at,map_bibbles(id,map_id,title,description,status,progress,position_x,position_y,resources,notes),map_edges(id,map_id,source_id,target_id)")
      .order("updated_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      return data.map((item) =>
        rowsToMap(
          {
            id: item.id,
            title: item.title,
            description: item.description,
            category: item.category,
            accent: item.accent,
            updated_at: item.updated_at,
          },
          (item.map_bibbles as BibbleRow[]) ?? [],
          (item.map_edges as EdgeRow[]) ?? []
        )
      );
    }

    // Fallback if joined query fails
    const { data: maps } = await supabase.from("learning_maps").select("id,title,description,category,accent,updated_at").order("updated_at", { ascending: false });
    if (!maps) return [];
    const loaded = await Promise.all(maps.map((map) => loadMapFromSupabase(map.id)));
    return loaded.filter((map): map is LearningMap => Boolean(map));
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
