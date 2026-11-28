import { describe, it, expect } from "vitest";
import {
  applySugiyamaLayout,
  assignTopologicalLayers,
  calculateSmartPosition,
  computeHierarchicalCoordinates,
  orderLayersByBarycenter,
} from "./layout";

describe("Sugiyama Hierarchical DAG Auto-Layout (Issue #154)", () => {
  describe("assignTopologicalLayers", () => {
    it("assigns root concepts to layer 0 and dependents to deeper layers", () => {
      const nodeIds = ["arrays", "searching", "binary-search"];
      const edges = [
        { source: "arrays", target: "searching" },
        { source: "searching", target: "binary-search" },
      ];

      const layers = assignTopologicalLayers(nodeIds, edges);
      expect(layers.get("arrays")).toBe(0);
      expect(layers.get("searching")).toBe(1);
      expect(layers.get("binary-search")).toBe(2);
    });

    it("handles diamond dependencies correctly with max prerequisite depth", () => {
      // A -> B -> D, A -> C -> D
      const nodeIds = ["A", "B", "C", "D"];
      const edges = [
        { source: "A", target: "B" },
        { source: "A", target: "C" },
        { source: "B", target: "D" },
        { source: "C", target: "D" },
      ];

      const layers = assignTopologicalLayers(nodeIds, edges);
      expect(layers.get("A")).toBe(0);
      expect(layers.get("B")).toBe(1);
      expect(layers.get("C")).toBe(1);
      expect(layers.get("D")).toBe(2);
    });

    it("handles disconnected graphs with multiple independent roots", () => {
      const nodeIds = ["CS-101", "CS-102", "MATH-101", "MATH-102"];
      const edges = [
        { source: "CS-101", target: "CS-102" },
        { source: "MATH-101", target: "MATH-102" },
      ];

      const layers = assignTopologicalLayers(nodeIds, edges);
      expect(layers.get("CS-101")).toBe(0);
      expect(layers.get("MATH-101")).toBe(0);
      expect(layers.get("CS-102")).toBe(1);
      expect(layers.get("MATH-102")).toBe(1);
    });
  });

  describe("orderLayersByBarycenter", () => {
    it("orders vertices to untangle edge crossings based on parent barycenters", () => {
      // Layer 0: [P1, P2]
      // Layer 1: [C2, C1] where P1 -> C1, P2 -> C2 (inverted order causing edge crossing)
      const layers = [
        ["P1", "P2"],
        ["C2", "C1"],
      ];
      const edges = [
        { source: "P1", target: "C1" },
        { source: "P2", target: "C2" },
      ];

      const ordered = orderLayersByBarycenter(layers, edges);
      // C1 (connected to P1 at idx 0) should precede C2 (connected to P2 at idx 1)
      expect(ordered[1]).toEqual(["C1", "C2"]);
    });
  });

  describe("computeHierarchicalCoordinates", () => {
    it("produces collision-free coordinates with proper vertical rank separation", () => {
      const layers = [
        ["Root-1", "Root-2"],
        ["Mid-1"],
      ];

      const coords = computeHierarchicalCoordinates(layers, {
        nodeWidth: 160,
        nodeHeight: 100,
        horizontalSpacing: 80,
        verticalSpacing: 100,
        startX: 100,
        startY: 100,
      });

      const root1 = coords.get("Root-1")!;
      const root2 = coords.get("Root-2")!;
      const mid1 = coords.get("Mid-1")!;

      // Roots should share the same Y coordinate and differ in X by at least nodeWidth + spacing
      expect(root1.y).toBe(100);
      expect(root2.y).toBe(100);
      expect(Math.abs(root2.x - root1.x)).toBeGreaterThanOrEqual(240);

      // Mid-1 should be in the next vertical rank (Y = 100 + 100 + 100 = 300)
      expect(mid1.y).toBe(300);
    });
  });

  describe("applySugiyamaLayout", () => {
    it("updates node positions while preserving node metadata", () => {
      const nodes = [
        { id: "A", position: { x: 0, y: 0 }, data: { title: "Node A", status: "completed" } },
        { id: "B", position: { x: 0, y: 0 }, data: { title: "Node B", status: "learning" } },
      ];
      const edges = [{ source: "A", target: "B" }];

      const result = applySugiyamaLayout(nodes, edges);
      expect(result[0].data?.title).toBe("Node A");
      expect(result[1].data?.status).toBe("learning");
      expect(result[1].position.y).toBeGreaterThan(result[0].position.y);
    });

    it("ensures strict layer monotonicity along directed edges (target Y > source Y)", () => {
      const nodes = [
        { id: "n1", position: { x: 0, y: 0 } },
        { id: "n2", position: { x: 0, y: 0 } },
        { id: "n3", position: { x: 0, y: 0 } },
        { id: "n4", position: { x: 0, y: 0 } },
      ];
      const edges = [
        { source: "n1", target: "n2" },
        { source: "n2", target: "n3" },
        { source: "n3", target: "n4" },
      ];

      const result = applySugiyamaLayout(nodes, edges);
      const posMap = new Map(result.map((n) => [n.id, n.position]));

      expect(posMap.get("n2")!.y).toBeGreaterThan(posMap.get("n1")!.y);
      expect(posMap.get("n3")!.y).toBeGreaterThan(posMap.get("n2")!.y);
      expect(posMap.get("n4")!.y).toBeGreaterThan(posMap.get("n3")!.y);
    });
  });

  describe("calculateSmartPosition", () => {
    it("returns start coordinate on empty graph", () => {
      const pos = calculateSmartPosition([]);
      expect(pos).toEqual({ x: 120, y: 100 });
    });

    it("places new node near reference node without overlapping", () => {
      const existing = [
        { id: "node-1", position: { x: 200, y: 200 } },
      ];

      const pos = calculateSmartPosition(existing, [], "node-1");
      // Must not collide with node-1
      expect(pos.y).toBeGreaterThan(200);
      expect(pos.x).toBe(200);
    });

    it("avoids stacking when multiple nodes already occupy positions", () => {
      const existing = [
        { id: "node-1", position: { x: 200, y: 200 } },
        { id: "node-2", position: { x: 200, y: 410 } },
      ];

      const pos = calculateSmartPosition(existing, [], "node-1");
      // Since downward position is occupied by node-2, it should fallback to adjacent/horizontal slot
      expect(pos).not.toEqual({ x: 200, y: 200 });
      expect(pos).not.toEqual({ x: 200, y: 410 });
    });
  });
});
