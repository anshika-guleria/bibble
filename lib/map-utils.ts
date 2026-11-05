import type { BibbleNodeData, LearningMap } from "@/types/map";
import type { Edge, Node } from "@xyflow/react";
import { sanitizeResources } from "@/lib/resource-url";

export function mapToFlow(map: LearningMap): { nodes: Node<BibbleNodeData>[]; edges: Edge[] } {
  return {
    nodes: map.bibbles.map((bibble) => ({
      id: bibble.id,
      type: "bibble",
      position: bibble.position,
      data: {
        ...bibble,
        resources: sanitizeResources(bibble.resources),
      },
      width: 155,
      height: 96,
      measured: { width: 155, height: 96 },
    })) as Node<BibbleNodeData>[],
    edges: map.edges.map((edge) => ({
      ...edge,
      type: "smoothstep",
      animated: true,
      style: { stroke: "var(--primary)", strokeWidth: 2 },
    })),
  };
}

export function flowToMap(map: LearningMap, nodes: Node<BibbleNodeData>[], edges: Edge[]): LearningMap {
  const nodeIds = new Set(nodes.map((node) => node.id));
  return {
    ...map,
    bibbles: nodes.map((node) => ({
      ...node.data,
      resources: sanitizeResources(node.data.resources),
      position: node.position,
    })),
    // Never save an edge whose bibble is gone.
    edges: edges
      .filter(({ source, target }) => nodeIds.has(source) && nodeIds.has(target))
      .map(({ id, source, target }) => ({ id, source, target })),
  };
}
