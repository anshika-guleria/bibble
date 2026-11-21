import type { LearningMap } from "@/types/map";

export class ConcurrencyConflictError extends Error {
  constructor() { super("CONCURRENCY_CONFLICT"); this.name = "ConcurrencyConflictError"; }
}

export function nextMapVersion(expected: number | undefined, stored: LearningMap | undefined): number {
  if (!stored) {
    if (expected !== undefined) throw new ConcurrencyConflictError();
    return 1;
  }
  const current = stored.version ?? 1;
  if (expected !== current) throw new ConcurrencyConflictError();
  return current + 1;
}

/** Fresh global primary keys, including connection endpoints and resource objects. */
export function cloneMapForConflict(map: LearningMap, id = `map-${crypto.randomUUID()}`): LearningMap {
  const ids = new Map(map.bibbles.map((b, index) => [b.id, `${id}-b-${index}`]));
  return {
    ...map, id, version: undefined, title: `${map.title} (copy)`,
    bibbles: map.bibbles.map((b) => ({ ...b, id: ids.get(b.id)!, position: { ...b.position }, resources: b.resources?.map((r) => ({ ...r })) })),
    edges: map.edges.filter((e) => ids.has(e.source) && ids.has(e.target)).map((e,index) => ({ id: `${id}-e-${index}`, source: ids.get(e.source)!, target: ids.get(e.target)! })),
  };
}

/** Web Locks serialize the local compare-and-swap across tabs on this origin. */
export async function saveLocalMapVersioned(map: LearningMap, storageKey: string): Promise<LearningMap> {
  if (!navigator.locks) throw new Error("This browser cannot safely coordinate offline saves across tabs.");
  return navigator.locks.request(`bibble-save:${storageKey}`, () => {
    const stored: LearningMap[] = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    if (!Array.isArray(stored)) throw new Error("Stored maps could not be read.");
    const next = { ...map, version: nextMapVersion(map.version, stored.find((m) => m.id === map.id)) };
    window.localStorage.setItem(storageKey, JSON.stringify([...stored.filter((m) => m.id !== map.id), next]));
    window.dispatchEvent(new Event("bibble-storage-change"));
    return next;
  });
}
