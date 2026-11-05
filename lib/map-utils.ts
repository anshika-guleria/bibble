import type { BibbleNodeData, LearningMap } from "@/types/map";
import type { Edge, Node } from "@xyflow/react";

export function mapToFlow(
  map: LearningMap,
  options?: { animated?: boolean },
): { nodes: Node<BibbleNodeData>[]; edges: Edge[] } {
  const animated = options?.animated ?? true;
  return {
    nodes: map.bibbles.map((bibble) => ({
      id: bibble.id,
      type: "bibble",
      position: bibble.position,
      data: bibble,
      width: 155,
      height: 96,
      measured: { width: 155, height: 96 },
    })) as Node<BibbleNodeData>[],
    edges: map.edges.map((edge) => ({
      ...edge,
      type: "smoothstep",
      animated,
      style: { stroke: "var(--primary)", strokeWidth: 2 },
    })),
  };
}

export function flowToMap(map: LearningMap, nodes: Node<BibbleNodeData>[], edges: Edge[]): LearningMap {
  const nodeIds = new Set(nodes.map((node) => node.id));
  return {
    ...map,
    bibbles: nodes.map((node) => ({ ...node.data, position: node.position })),
    // Never save an edge whose bibble is gone.
    edges: edges
      .filter(({ source, target }) => nodeIds.has(source) && nodeIds.has(target))
      .map(({ id, source, target }) => ({ id, source, target })),
  };
}
