import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  BASE_STORAGE_KEY_DELETED,
  BASE_STORAGE_KEY_MAPS,
  clearUserScopedStorage,
  copyMapForMigration,
  getStoredMapsForScope,
  getUserScopedKey,
  migrateGuestMapsToAccount,
  reconcileLocalAndRemoteMaps,
  setStoredMapsForScope,
} from "./sync";
import type { LearningMap } from "@/types/map";

const mockMap1: LearningMap = {
  id: "guest-map-1",
  title: "Guest Learning",
  description: "A customized guest map",
  category: "Personal growth",
  accent: "lavender",
  bibbles: [
    {
      id: "b-1",
      title: "Step 1",
      status: "learning",
      progress: 50,
      position: { x: 0, y: 0 },
    },
  ],
  edges: [],
};

const mockMap2: LearningMap = {
  id: "guest-map-2",
  title: "Second Guest Map",
  description: "Another guest map",
  category: "Career",
  accent: "mint",
  bibbles: [],
  edges: [],
};

const mockSaveMapToSupabase = vi.fn();

vi.mock("@/lib/maps/persistence", () => ({
  saveMapToSupabase: (map: LearningMap, userId: string) => mockSaveMapToSupabase(map, userId),
}));

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => storageMap.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    storageMap.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    storageMap.delete(key);
  }),
  clear: vi.fn(() => {
    storageMap.clear();
  }),
};

describe("guest-to-authenticated map synchronization & storage isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMap.clear();
    (global as unknown as { window: { localStorage: typeof localStorageMock } }).window = {
      localStorage: localStorageMock,
    };
  });

  describe("getUserScopedKey", () => {
    it("returns guest namespace when user is null, undefined, or empty", () => {
      expect(getUserScopedKey(BASE_STORAGE_KEY_MAPS, null)).toBe("bibble-maps:guest");
      expect(getUserScopedKey(BASE_STORAGE_KEY_MAPS, undefined)).toBe("bibble-maps:guest");
      expect(getUserScopedKey(BASE_STORAGE_KEY_MAPS, "")).toBe("bibble-maps:guest");
      expect(getUserScopedKey(BASE_STORAGE_KEY_MAPS, "   ")).toBe("bibble-maps:guest");
    });

    it("returns user-specific namespace when user ID is provided", () => {
      expect(getUserScopedKey(BASE_STORAGE_KEY_MAPS, "usr_abc123")).toBe("bibble-maps:usr_abc123");
      expect(getUserScopedKey(BASE_STORAGE_KEY_DELETED, "usr_abc123")).toBe("bibble-deleted-maps:usr_abc123");
      expect(getUserScopedKey(BASE_STORAGE_KEY_MAPS, "  usr_trimmed  ")).toBe("bibble-maps:usr_trimmed");
    });
  });

  describe("getStoredMapsForScope & setStoredMapsForScope", () => {
    it("stores and retrieves maps under user-scoped key", () => {
      setStoredMapsForScope([mockMap1], "user-42");
      const retrieved = getStoredMapsForScope("user-42");
      expect(retrieved).toEqual([mockMap1]);

      // Verify guest storage remains isolated
      expect(getStoredMapsForScope(null)).toEqual([]);
    });

    it("falls back to legacy un-scoped key for guest and upgrades storage", () => {
      storageMap.set(BASE_STORAGE_KEY_MAPS, JSON.stringify([mockMap2]));
      const retrieved = getStoredMapsForScope(null);
      expect(retrieved).toEqual([mockMap2]);

      // Should have been copied to guest-scoped key
      expect(storageMap.get("bibble-maps:guest")).toBe(JSON.stringify([mockMap2]));
    });
  });

  describe("reconcileLocalAndRemoteMaps", () => {
    it("merges remote and local maps without duplicates", () => {
      const localMaps: LearningMap[] = [
        { ...mockMap1, title: "Local Version" },
        mockMap2,
      ];
      const remoteMaps: LearningMap[] = [
        { ...mockMap1, title: "Remote Authoritative Version" },
      ];

      const reconciled = reconcileLocalAndRemoteMaps(localMaps, remoteMaps);
      expect(reconciled).toHaveLength(2);
      expect(reconciled.find((m) => m.id === "guest-map-1")?.title).toBe("Remote Authoritative Version");
      expect(reconciled.find((m) => m.id === "guest-map-2")?.title).toBe("Second Guest Map");
    });
  });

  describe("migrateGuestMapsToAccount", () => {
    it("returns 0 migrated when no guest maps exist", async () => {
      const result = await migrateGuestMapsToAccount("user-1");
      expect(result.migratedCount).toBe(0);
      expect(mockSaveMapToSupabase).not.toHaveBeenCalled();
    });

    it("migrates guest maps to Supabase and transfers to user scope", async () => {
      setStoredMapsForScope([mockMap1, mockMap2], null);
      mockSaveMapToSupabase.mockResolvedValue(true);

      const result = await migrateGuestMapsToAccount("user-auth-1");
      expect(result.migratedCount).toBe(2);
      expect(result.migratedIds).toEqual(["guest-map-1", "guest-map-2"]);
      expect(mockSaveMapToSupabase).toHaveBeenCalledTimes(2);

      // Verify maps are now in authenticated user's scoped storage
      const userMaps = getStoredMapsForScope("user-auth-1");
      expect(userMaps).toHaveLength(2);

      // Verify guest storage has been cleanly cleared
      const remainingGuest = getStoredMapsForScope(null);
      expect(remainingGuest).toHaveLength(0);
      expect(storageMap.get(BASE_STORAGE_KEY_MAPS)).toBeUndefined();
    });

    it("retains guest maps that failed to save so user does not lose data", async () => {
      setStoredMapsForScope([mockMap1, mockMap2], null);
      // Map 1 succeeds, Map 2 fails (e.g. network error)
      mockSaveMapToSupabase.mockImplementation(async (m: LearningMap) => m.title === mockMap1.title);

      const result = await migrateGuestMapsToAccount("user-auth-1");
      expect(result.migratedCount).toBe(1);
      expect(result.failedIds).toEqual(["guest-map-2"]);

      // Map 1 should be in user storage
      const userMaps = getStoredMapsForScope("user-auth-1");
      expect(userMaps).toHaveLength(1);
      expect(userMaps[0].title).toBe(mockMap1.title);
      expect(userMaps[0].id).not.toBe(mockMap1.id);

      // Map 2 should remain in guest storage for retry
      const guestMaps = getStoredMapsForScope(null);
      expect(guestMaps).toHaveLength(1);
      expect(guestMaps[0].id).toBe("guest-map-2");
    });
  });

  describe("clearUserScopedStorage", () => {
    it("clears user-specific maps and preferences on session teardown", () => {
      setStoredMapsForScope([mockMap1], "user-to-logout");
      storageMap.set("bibble-deleted-maps:user-to-logout", JSON.stringify(["del-1"]));

      clearUserScopedStorage("user-to-logout");

      expect(getStoredMapsForScope("user-to-logout")).toEqual([]);
      expect(storageMap.get("bibble-deleted-maps:user-to-logout")).toBeUndefined();
    });
  });
});

describe("sync data integrity regressions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMap.clear();
    (global as unknown as { window: { localStorage: typeof localStorageMock } }).window = { localStorage: localStorageMock };
  });

  it("claims legacy guest maps only once", () => {
    storageMap.set(BASE_STORAGE_KEY_MAPS, JSON.stringify([mockMap1]));
    expect(getStoredMapsForScope(null)).toHaveLength(1);
    expect(storageMap.has(BASE_STORAGE_KEY_MAPS)).toBe(false);
    setStoredMapsForScope([], null);
    expect(getStoredMapsForScope(null)).toEqual([]);
  });

  it("keeps private offline maps isolated after logout without deleting them", () => {
    setStoredMapsForScope([mockMap1], "account-a");
    expect(getStoredMapsForScope(null)).toEqual([]);
    expect(getStoredMapsForScope("account-b")).toEqual([]);
    expect(getStoredMapsForScope("account-a")).toEqual([mockMap1]);
  });

  it("uses timestamps to keep newer offline edits", () => {
    const local = { ...mockMap1, updatedAt: "2026-11-20T12:00:00Z" };
    const remote = { ...mockMap1, title: "Older cloud copy", updatedAt: "2026-11-19T12:00:00Z" };
    expect(reconcileLocalAndRemoteMaps([local], [remote])).toEqual([local]);
    expect(reconcileLocalAndRemoteMaps([remote], [local])).toEqual([local]);
  });

  it("rekeys the entire graph to avoid global database ID collisions", () => {
    const original = { ...mockMap1, bibbles: [mockMap1.bibbles[0], { ...mockMap1.bibbles[0], id: "b-2" }], edges: [{ id: "e-1", source: "b-1", target: "b-2" }] };
    const copy = copyMapForMigration(original, "new-map");
    expect(copy.id).toBe("new-map");
    expect(copy.bibbles.map((b) => b.id)).toEqual(["new-map-b-0", "new-map-b-1"]);
    expect(copy.edges[0]).toEqual({ id: "new-map-e-0", source: "new-map-b-0", target: "new-map-b-1" });
    copy.bibbles[0].position.x = 99;
    expect(original.bibbles[0].position.x).toBe(0);
  });
  it("does not carry a source graph's revision into a newly migrated map", () => {
    const versioned = { ...mockMap1, version: 7 };
    expect(copyMapForMigration(versioned)).not.toHaveProperty("version");
  });

  it("requires persistence confirmation for the intended account", async () => {
    setStoredMapsForScope([mockMap1], null);
    mockSaveMapToSupabase.mockResolvedValue(false);
    const result = await migrateGuestMapsToAccount("account-a");
    expect(result.failedIds).toEqual([mockMap1.id]);
    expect(mockSaveMapToSupabase).toHaveBeenCalledWith(expect.objectContaining({ title: mockMap1.title }), "account-a");
    expect(getStoredMapsForScope(null)).toEqual([mockMap1]);
  });

  it("retains the guest original if private cache storage is full", async () => {
    setStoredMapsForScope([mockMap1], null);
    mockSaveMapToSupabase.mockResolvedValue(true);
    localStorageMock.setItem.mockImplementationOnce(() => { throw new Error("Quota exceeded"); });
    const result = await migrateGuestMapsToAccount("account-a");
    expect(result.failedIds).toEqual([mockMap1.id]);
    expect(getStoredMapsForScope(null)).toEqual([mockMap1]);
  });

  it("does not discard edits made while the upload is in flight", async () => {
    setStoredMapsForScope([mockMap1], null);
    mockSaveMapToSupabase.mockImplementationOnce(async () => {
      setStoredMapsForScope([{ ...mockMap1, title: "Edited during upload" }], null);
      return true;
    });
    await migrateGuestMapsToAccount("account-a");
    expect(getStoredMapsForScope(null)[0].title).toBe("Edited during upload");
  });

  it("deduplicates concurrent login sync triggers", async () => {
    setStoredMapsForScope([mockMap1], null);
    mockSaveMapToSupabase.mockResolvedValue(true);
    await Promise.all([migrateGuestMapsToAccount("account-a"), migrateGuestMapsToAccount("account-a")]);
    expect(mockSaveMapToSupabase).toHaveBeenCalledTimes(1);
  });

  it("preserves malformed storage instead of deleting it", () => {
    storageMap.set("bibble-maps:guest", "{broken");
    expect(() => getStoredMapsForScope(null)).toThrow();
    expect(storageMap.get("bibble-maps:guest")).toBe("{broken");
  });
});
