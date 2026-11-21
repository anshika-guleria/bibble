import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteMapFromSupabase,
  listMapsFromSupabase,
  loadMapFromSupabase,
  mapToRows,
  rowsToMap,
  saveMapToSupabase,
} from "./persistence";
import type { LearningMap } from "@/types/map";

const mockMap: LearningMap = {
  id: "map-1",
  title: "Learning",
  description: "A small map",
  category: "Personal growth",
  accent: "lavender",
  bibbles: [
    {
      id: "b-1",
      title: "Start",
      description: "Begin",
      status: "learning",
      progress: 25,
      position: { x: 10, y: 20 },
      resources: [{ id: "r-1", label: "Guide", url: "https://example.com" }],
      notes: "Keep going",
    },
    {
      id: "b-2",
      title: "Continue",
      description: "",
      status: "not-started",
      progress: 0,
      position: { x: 40, y: 20 },
      resources: [],
      notes: "",
    },
  ],
  edges: [{ id: "e-1", source: "b-1", target: "b-2" }],
};

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  rpc: vi.fn(),
  from: vi.fn(),
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabase,
}));

describe("map persistence mapping", () => {
  it("stores nested bibble positions and ownership-free rows", () => {
    const rows = mapToRows(mockMap);
    expect(rows.map).toEqual({ id: "map-1", title: "Learning", description: "A small map", category: "Personal growth", accent: "lavender" });
    expect(rows.bibbles[0]).toMatchObject({ map_id: "map-1", position_x: 10, position_y: 20 });
    expect(rows.bibbles[0]).not.toHaveProperty("user_id");
    expect(rows.edges[0]).toMatchObject({ map_id: "map-1", source_id: "b-1", target_id: "b-2" });
  });

  it("round-trips a map through database row shapes", () => {
    const rows = mapToRows(mockMap);
    const domainMap = rowsToMap(rows.map, rows.bibbles, rows.edges);
    expect(domainMap).toEqual(mockMap);
    expect(domainMap.bibbles[0]).not.toHaveProperty("map_id");
    expect(domainMap.edges[0]).not.toHaveProperty("source_id");
    expect(domainMap.edges[0]).not.toHaveProperty("target_id");
  });
});

describe("atomic Supabase persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
  });

  describe("saveMapToSupabase", () => {
    it("does not acknowledge a migration when cloud persistence is unconfigured", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      expect(await saveMapToSupabase(mockMap, "user-123")).toBe(false);
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });

    it.each([null, { id: "another-user" }])("rejects migration for a missing or different account: %j", async (user) => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user } });
      expect(await saveMapToSupabase(mockMap, "user-123")).toBe(false);
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });

    it("returns true early if Supabase is unconfigured", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      const result = await saveMapToSupabase(mockMap);
      expect(result).toBe(true);
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });

    it("executes atomic RPC procedure as primary path", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

      const success = await saveMapToSupabase(mockMap);
      expect(success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith("save_learning_map_atomic", expect.objectContaining({
        p_map: expect.objectContaining({ id: "map-1" }),
        p_bibbles: expect.arrayContaining([expect.objectContaining({ id: "b-1" })]),
        p_edges: expect.arrayContaining([expect.objectContaining({ id: "e-1" })]),
      }));
    });

    it("does not attempt table writes after an RPC constraint error", async () => {
      mockSupabase.rpc.mockResolvedValue({
        error: { code: "23514", message: "check constraint violation: progress between 0 and 100" },
      });

      const success = await saveMapToSupabase(mockMap);
      expect(success).toBe(false);
      // Fallback table operations should NOT be called when RPC fails with standard constraint error
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("fails closed when the atomic migration is not deployed", async () => {
      mockSupabase.rpc.mockResolvedValue({
        error: { code: "PGRST202", message: "Could not find the function save_learning_map_atomic" },
      });

      const success = await saveMapToSupabase(mockMap);
      expect(success).toBe(false);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("requires a positive RPC acknowledgement", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: false, error: null });
      expect(await saveMapToSupabase(mockMap)).toBe(false);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("handles network failures without issuing non-atomic table writes", async () => {
      mockSupabase.rpc.mockRejectedValue(new Error("Network disconnected"));
      expect(await saveMapToSupabase(mockMap)).toBe(false);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe("loadMapFromSupabase", () => {
    it("loads map, bibbles, and edges in a single joined query", async () => {
      const dbRow = {
        id: "map-1",
        title: "Learning",
        description: "A small map",
        category: "Personal growth",
        accent: "lavender",
        map_bibbles: [
          {
            id: "b-1",
            map_id: "map-1",
            title: "Start",
            description: "Begin",
            status: "learning",
            progress: 25,
            position_x: 10,
            position_y: 20,
            resources: [],
            notes: "",
          },
        ],
        map_edges: [
          { id: "e-1", map_id: "map-1", source_id: "b-1", target_id: "b-2" },
        ],
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: dbRow, error: null }),
          }),
        }),
      });

      const result = await loadMapFromSupabase("map-1");
      expect(result).not.toBeNull();
      expect(result?.id).toBe("map-1");
      expect(result?.bibbles).toHaveLength(1);
      expect(result?.bibbles[0].position).toEqual({ x: 10, y: 20 });
      expect(result?.edges).toHaveLength(1);
    });
  });

  describe("listMapsFromSupabase", () => {
    it("retrieves all maps and nested associations in a single query", async () => {
      const dbRows = [
        {
          id: "map-1",
          title: "Learning 1",
          description: "Map one",
          category: "Personal growth",
          accent: "lavender",
          map_bibbles: [],
          map_edges: [],
        },
        {
          id: "map-2",
          title: "Learning 2",
          description: "Map two",
          category: "Career",
          accent: "mint",
          map_bibbles: [],
          map_edges: [],
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: dbRows, error: null }),
        }),
      });

      const results = await listMapsFromSupabase();
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe("map-1");
      expect(results[1].id).toBe("map-2");
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
      expect(mockSupabase.from).toHaveBeenCalledWith("learning_maps");
    });
  });

  describe("deleteMapFromSupabase", () => {
    it("deletes map by id", async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const success = await deleteMapFromSupabase("map-1");
      expect(success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("learning_maps");
    });
  });
});
