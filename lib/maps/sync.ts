import type { LearningMap } from "@/types/map";
import { saveMapToSupabase } from "@/lib/maps/persistence";
import { sampleMaps } from "@/data/sample-maps";
import { validateMapData } from "./export-import";

export const BASE_STORAGE_KEY_MAPS = "bibble-maps";
export const BASE_STORAGE_KEY_DELETED = "bibble-deleted-maps";
const CHANGE_EVENT = "bibble-storage-change";

export function getUserScopedKey(baseKey: string, userId?: string | null): string {
  return `${baseKey}:${userId?.trim() || "guest"}`;
}

function readMaps(key: string): LearningMap[] {
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data) || data.some((map) => !validateMapData(map).success)) {
    throw new Error("Stored map data is invalid; the original data has been preserved.");
  }
  return data;
}

export function getStoredMapsForScope(userId?: string | null): LearningMap[] {
  if (typeof window === "undefined") return [];
  const key = getUserScopedKey(BASE_STORAGE_KEY_MAPS, userId);
  const scoped = readMaps(key);
  // Legacy records are claimed once by the guest workspace, never a private account.
  if (!userId && window.localStorage.getItem(BASE_STORAGE_KEY_MAPS)) {
    const legacy = readMaps(BASE_STORAGE_KEY_MAPS);
    const merged = [...scoped, ...legacy.filter((m) => !scoped.some((s) => s.id === m.id))];
    setStoredMapsForScope(merged, null);
    window.localStorage.removeItem(BASE_STORAGE_KEY_MAPS);
    return merged;
  }
  return scoped;
}

export function setStoredMapsForScope(maps: LearningMap[], userId?: string | null): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getUserScopedKey(BASE_STORAGE_KEY_MAPS, userId), JSON.stringify(maps));
  window.dispatchEvent?.(new Event(CHANGE_EVENT));
}

/** Prefer a newer timestamp only when both sides have trustworthy timestamps. */
export function reconcileLocalAndRemoteMaps(localMaps: LearningMap[], remoteMaps: LearningMap[]): LearningMap[] {
  const maps = new Map(localMaps.map((m) => [m.id, m]));
  for (const remote of remoteMaps) {
    const local = maps.get(remote.id);
    const localTime = Date.parse(local?.updatedAt ?? "");
    const remoteTime = Date.parse(remote.updatedAt ?? "");
    if (!local || !Number.isFinite(localTime) || !Number.isFinite(remoteTime) || localTime <= remoteTime) {
      maps.set(remote.id, remote);
    }
  }
  return [...maps.values()];
}

/** Global database primary keys require fresh map, node, and edge identities. */
export function copyMapForMigration(map: LearningMap, id = `map-${crypto.randomUUID()}`): LearningMap {
  const ids = new Map(map.bibbles.map((b, index) => [b.id, `${id}-b-${index}`]));
  return {
    id, title: map.title, description: map.description, category: map.category, accent: map.accent, updatedAt: map.updatedAt,
    bibbles: map.bibbles.map((b) => ({ ...b, id: ids.get(b.id)!, position: { ...b.position }, resources: b.resources?.map((r) => ({ ...r })) })),
    edges: map.edges.map((e, index) => ({ id: `${id}-e-${index}`, source: ids.get(e.source)!, target: ids.get(e.target)! })),
  };
}

export interface MigrationResult {
  migratedCount: number;
  migratedIds: string[];
  failedIds: string[];
  errors: string[];
}

const pending = new Map<string, Promise<MigrationResult>>();

export function migrateGuestMapsToAccount(userId: string): Promise<MigrationResult> {
  const existing = pending.get(userId);
  if (existing) return existing;
  const operation = migrate(userId).finally(() => { pending.delete(userId); });
  pending.set(userId, operation);
  return operation;
}

async function migrate(userId: string): Promise<MigrationResult> {
  const result: MigrationResult = { migratedCount: 0, migratedIds: [], failedIds: [], errors: [] };
  if (typeof window === "undefined" || !userId.trim()) return result;
  const candidates = getStoredMapsForScope(null).filter((map) => {
    const sample = sampleMaps.find((s) => s.id === map.id);
    return !sample || JSON.stringify(sample) !== JSON.stringify(map);
  });
  for (const map of candidates) {
    try {
      const copy = copyMapForMigration(map);
      if (!await saveMapToSupabase(copy, userId)) throw new Error(`Could not sync "${map.title}".`);
      // Re-read after awaiting so concurrent cache writes are preserved.
      const userMaps = getStoredMapsForScope(userId);
      setStoredMapsForScope([...userMaps, copy], userId);
      const guests = getStoredMapsForScope(null);
      // An edit made during upload must remain available for another sync.
      setStoredMapsForScope(guests.filter((m) => m.id !== map.id || JSON.stringify(m) !== JSON.stringify(map)), null);
      result.migratedIds.push(map.id);
    } catch (error) {
      result.failedIds.push(map.id);
      result.errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  result.migratedCount = result.migratedIds.length;
  return result;
}

/** Explicit cache removal; logout instead isolates and preserves offline private edits. */
export function clearUserScopedStorage(userId?: string | null): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getUserScopedKey(BASE_STORAGE_KEY_MAPS, userId));
  window.localStorage.removeItem(getUserScopedKey(BASE_STORAGE_KEY_DELETED, userId));
  window.dispatchEvent?.(new Event(CHANGE_EVENT));
}
