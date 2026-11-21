import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LearningMap } from "@/types/map";
import { cloneMapForConflict, ConcurrencyConflictError, nextMapVersion, saveLocalMapVersioned } from "./concurrency";
import { mapToRows, rowsToMap, saveMapWithVersion } from "./persistence";

const client = vi.hoisted(() => ({ auth: { getUser: vi.fn() }, rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => client }));
const map: LearningMap = {
  id: "map-1", title: "Learning", description: "Keep both edits", category: "Personal growth", accent: "lavender", version: 1,
  bibbles: [
    { id: "a", title: "A", status: "learning", progress: 50, position: { x: 0, y: 0 }, resources: [{ id: "r", label: "Guide", url: "https://example.com" }] },
    { id: "b", title: "B", status: "not-started", progress: 0, position: { x: 250, y: 0 } },
  ], edges: [{ id: "a-b", source: "a", target: "b" }],
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
  client.auth.getUser.mockResolvedValue({ data: { user: { id: "owner" } } });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("versioned map persistence", () => {
  it("round trips version tokens through row mapping", () => {
    const rows = mapToRows(map);
    expect(rows.map.version).toBe(1);
    expect(rowsToMap(rows.map, rows.bibbles, rows.edges)).toMatchObject(map);
  });
  it("accepts the committed version returned by the RPC", async () => {
    client.rpc.mockResolvedValue({ data: 2, error: null });
    expect(await saveMapWithVersion(map)).toMatchObject({ status: "saved", map: { version: 2 } });
    expect(client.rpc).toHaveBeenCalledWith("save_learning_map_versioned", expect.objectContaining({ p_expected_version: 1 }));
    expect(map.version).toBe(1);
  });
  it("uses null only for a new map", async () => {
    client.rpc.mockResolvedValue({ data: 1, error: null });
    await saveMapWithVersion({ ...map, version: undefined });
    expect(client.rpc).toHaveBeenCalledWith("save_learning_map_versioned", expect.objectContaining({ p_expected_version: null }));
  });
  it("rejects a stale second tab without trying direct writes", async () => {
    client.rpc.mockResolvedValueOnce({ data: 2, error: null }).mockResolvedValueOnce({ data: null, error: { code: "PT409", message: "CONCURRENCY_CONFLICT" } });
    expect((await saveMapWithVersion({ ...map, title: "Tab A" })).status).toBe("saved");
    expect((await saveMapWithVersion({ ...map, title: "Tab B" })).status).toBe("conflict");
    expect(client.from).not.toHaveBeenCalled();
  });
  it("fails closed on a missing migration", async () => {
    client.rpc.mockResolvedValue({ error: { code: "PGRST202" } });
    expect((await saveMapWithVersion(map)).status).toBe("error");
    expect(client.from).not.toHaveBeenCalled();
  });
  it("does not report success for an invalid RPC acknowledgement", async () => {
    client.rpc.mockResolvedValue({ data: true, error: null });
    expect((await saveMapWithVersion(map)).status).toBe("error");
  });
  it("keeps network errors distinct from conflicts", async () => {
    client.rpc.mockRejectedValue(new Error("Offline"));
    expect(await saveMapWithVersion(map)).toEqual({ status: "error", message: "Offline" });
  });
  it("does not silently fall back to offline storage on an auth network failure", async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: null }, error: { name: "AuthRetryableFetchError" } });
    expect((await saveMapWithVersion(map)).status).toBe("error");
    expect(client.rpc).not.toHaveBeenCalled();
  });
});

describe("non-destructive branching", () => {
  it("assigns fresh map, bibble, and edge IDs with valid endpoints", () => {
    const copy = cloneMapForConflict(map, "new-map");
    expect(copy.version).toBeUndefined();
    expect(copy.id).toBe("new-map");
    expect(copy.edges).toEqual([{ id: "new-map-e-0", source: "new-map-b-0", target: "new-map-b-1" }]);
    expect(copy.bibbles.map((b) => b.id)).toEqual(["new-map-b-0", "new-map-b-1"]);
    copy.bibbles[0].position.x = 99;
    copy.bibbles[0].resources![0].label = "Changed";
    expect(map.bibbles[0].position.x).toBe(0);
    expect(map.bibbles[0].resources![0].label).toBe("Guide");
  });
  it("starts new maps at 1 and upgrades legacy maps at 1", () => {
    expect(nextMapVersion(undefined, undefined)).toBe(1);
    expect(nextMapVersion(1, { ...map, version: undefined })).toBe(2);
  });
  it("rejects stale, deleted, or already-created maps", () => {
    expect(() => nextMapVersion(1, { ...map, version: 2 })).toThrow(ConcurrencyConflictError);
    expect(() => nextMapVersion(1, undefined)).toThrow(ConcurrencyConflictError);
    expect(() => nextMapVersion(undefined, map)).toThrow(ConcurrencyConflictError);
  });
  it("serializes competing offline saves and preserves the first winner", async () => {
    let raw = JSON.stringify([map]);
    let queue: Promise<unknown> = Promise.resolve();
    const request = vi.fn((_name: string, callback: () => unknown) => {
      const result = queue.then(callback);
      queue = result.catch(() => {});
      return result;
    });
    vi.stubGlobal("navigator", { locks: { request } });
    vi.stubGlobal("window", { localStorage: { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } }, dispatchEvent: vi.fn() });
    const results = await Promise.allSettled([
      saveLocalMapVersioned({ ...map, title: "Tab A" }, "maps"),
      saveLocalMapVersioned({ ...map, title: "Tab B" }, "maps"),
    ]);
    expect(results.map((r) => r.status)).toEqual(["fulfilled", "rejected"]);
    expect(JSON.parse(raw)[0]).toMatchObject({ title: "Tab A", version: 2 });
  });
  it("fails safely when local coordination is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    await expect(saveLocalMapVersioned(map, "maps")).rejects.toThrow("safely coordinate");
  });
});
