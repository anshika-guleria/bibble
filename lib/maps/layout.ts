import type { MapEdge } from "@/types/map";

export interface LayoutPosition {
  x: number;
  y: number;
}

export interface LayoutOptions {
  rankDirection?: "TB" | "LR";
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalSpacing?: number;
  verticalSpacing?: number;
  startX?: number;
  startY?: number;
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  rankDirection: "TB",
  nodeWidth: 160,
  nodeHeight: 100,
  horizontalSpacing: 90,
  verticalSpacing: 110,
  startX: 120,
  startY: 100,
};

/**
 * Assigns each node to a topological layer (rank).
 * In a DAG (prerequisite -> dependent), roots have layer 0.
 * For any edge u -> v, layer(v) >= layer(u) + 1.
 */
export function assignTopologicalLayers(
  nodeIds: string[],
  edges: Array<Pick<MapEdge, "source" | "target">>,
): Map<string, number> {
  const layerMap = new Map<string, number>();
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  for (const id of nodeIds) {
    layerMap.set(id, 0);
    inDegree.set(id, 0);
    adj.set(id, []);
    incoming.set(id, []);
  }

  for (const edge of edges) {
    if (inDegree.has(edge.source) && inDegree.has(edge.target)) {
      adj.get(edge.source)!.push(edge.target);
      incoming.get(edge.target)!.push(edge.source);
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }
  }

  // Roots with in-degree 0 start at layer 0
  const queue: string[] = [];
  for (const id of nodeIds) {
    if ((inDegree.get(id) ?? 0) === 0) {
      queue.push(id);
      layerMap.set(id, 0);
    }
  }

  // Longest path leveling via topological progression
  const remainingInDegree = new Map(inDegree);
  while (queue.length > 0) {
    const u = queue.shift()!;
    const uLayer = layerMap.get(u) ?? 0;

    for (const v of adj.get(u) ?? []) {
      const currentVLayer = layerMap.get(v) ?? 0;
      if (uLayer + 1 > currentVLayer) {
        layerMap.set(v, uLayer + 1);
      }

      const deg = (remainingInDegree.get(v) ?? 1) - 1;
      remainingInDegree.set(v, deg);
      if (deg === 0) {
        queue.push(v);
      }
    }
  }

  // Handle any remaining disconnected or unvisited cycles cleanly
  for (const id of nodeIds) {
    if ((remainingInDegree.get(id) ?? 0) > 0) {
      const prereqs = incoming.get(id) ?? [];
      const maxPrereqLayer = prereqs.reduce((max, p) => Math.max(max, layerMap.get(p) ?? 0), 0);
      layerMap.set(id, maxPrereqLayer + 1);
    }
  }

  return layerMap;
}

/**
 * Organizes nodes into ordered tiers minimizing edge crossings using a two-pass barycentric heuristic.
 */
export function orderLayersByBarycenter(
  layers: string[][],
  edges: Array<Pick<MapEdge, "source" | "target">>,
): string[][] {
  if (layers.length <= 1) return layers;

  const result = layers.map((tier) => [...tier]);

  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();

  for (const edge of edges) {
    if (!incoming.has(edge.target)) incoming.set(edge.target, []);
    incoming.get(edge.target)!.push(edge.source);

    if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
    outgoing.get(edge.source)!.push(edge.target);
  }

  // Forward sweep: order layer L based on average position of parents in L-1
  for (let l = 1; l < result.length; l++) {
    const prevLayer = result[l - 1];
    const prevIndexMap = new Map(prevLayer.map((id, idx) => [id, idx]));

    result[l].sort((a, b) => {
      const parentsA = incoming.get(a) ?? [];
      const parentsB = incoming.get(b) ?? [];

      const avgA =
        parentsA.length > 0
          ? parentsA.reduce((sum, p) => sum + (prevIndexMap.get(p) ?? 0), 0) / parentsA.length
          : Infinity;
      const avgB =
        parentsB.length > 0
          ? parentsB.reduce((sum, p) => sum + (prevIndexMap.get(p) ?? 0), 0) / parentsB.length
          : Infinity;

      if (avgA !== avgB) return avgA - avgB;
      return a.localeCompare(b);
    });
  }

  // Reverse sweep: order layer L based on average position of children in L+1
  for (let l = result.length - 2; l >= 0; l--) {
    const nextLayer = result[l + 1];
    const nextIndexMap = new Map(nextLayer.map((id, idx) => [id, idx]));

    result[l].sort((a, b) => {
      const childrenA = outgoing.get(a) ?? [];
      const childrenB = outgoing.get(b) ?? [];

      const avgA =
        childrenA.length > 0
          ? childrenA.reduce((sum, c) => sum + (nextIndexMap.get(c) ?? 0), 0) / childrenA.length
          : Infinity;
      const avgB =
        childrenB.length > 0
          ? childrenB.reduce((sum, c) => sum + (nextIndexMap.get(c) ?? 0), 0) / childrenB.length
          : Infinity;

      if (avgA !== avgB) return avgA - avgB;
      return a.localeCompare(b);
    });
  }

  return result;
}

/**
 * Computes non-overlapping 2D coordinates for nodes assigned to ordered tiers.
 */
export function computeHierarchicalCoordinates(
  orderedLayers: string[][],
  options: LayoutOptions = {},
): Map<string, LayoutPosition> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const positionMap = new Map<string, LayoutPosition>();

  // Determine maximum width across tiers to center each tier
  const maxTierCount = Math.max(...orderedLayers.map((tier) => tier.length), 1);
  const maxWidth =
    maxTierCount * opts.nodeWidth + (maxTierCount - 1) * opts.horizontalSpacing;

  for (let l = 0; l < orderedLayers.length; l++) {
    const tier = orderedLayers[l];
    const tierCount = tier.length;
    const tierWidth =
      tierCount * opts.nodeWidth + (tierCount - 1) * opts.horizontalSpacing;

    // Center this tier within the overall layout width
    const tierStartX = opts.startX + Math.max(0, (maxWidth - tierWidth) / 2);
    const tierY = opts.startY + l * (opts.nodeHeight + opts.verticalSpacing);

    for (let i = 0; i < tier.length; i++) {
      const nodeId = tier[i];
      const nodeX = tierStartX + i * (opts.nodeWidth + opts.horizontalSpacing);

      if (opts.rankDirection === "TB") {
        positionMap.set(nodeId, { x: Math.round(nodeX), y: Math.round(tierY) });
      } else {
        // Left-to-Right orientation
        positionMap.set(nodeId, { x: Math.round(tierY), y: Math.round(nodeX) });
      }
    }
  }

  return positionMap;
}

export interface LayoutNode<TData = unknown> {
  id: string;
  position: LayoutPosition;
  data?: TData;
}

/**
 * Primary Sugiyama Auto-Layout entry point.
 * Formats any collection of DAG nodes and edges into a clean, collision-free hierarchy.
 */
export function applySugiyamaLayout<
  TNode extends LayoutNode = LayoutNode,
>(
  nodes: TNode[],
  edges: Array<Pick<MapEdge, "source" | "target">>,
  options: LayoutOptions = {},
): TNode[] {
  if (!Array.isArray(nodes) || nodes.length === 0) return [];

  const nodeIds = nodes.map((n) => n.id);
  const layerMap = assignTopologicalLayers(nodeIds, edges);

  // Group by layer index
  const layerGroups = new Map<number, string[]>();
  for (const [id, layer] of layerMap.entries()) {
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer)!.push(id);
  }

  const sortedLayerIndices = Array.from(layerGroups.keys()).sort((a, b) => a - b);
  const rawLayers = sortedLayerIndices.map((idx) => layerGroups.get(idx)!);

  // Minimize crossings
  const orderedLayers = orderLayersByBarycenter(rawLayers, edges);

  // Compute final coordinates
  const coordinates = computeHierarchicalCoordinates(orderedLayers, options);

  return nodes.map((node) => {
    const pos = coordinates.get(node.id) ?? node.position;
    return {
      ...node,
      position: { ...pos },
      data: node.data
        ? {
            ...node.data,
            ...(typeof node.data === "object" && node.data !== null && "position" in node.data
              ? { position: { ...pos } }
              : {}),
          }
        : undefined,
    };
  });
}

/**
 * Checks if two bounding boxes collide given a clearance margin.
 */
function isColliding(
  posA: LayoutPosition,
  posB: LayoutPosition,
  width: number,
  height: number,
  padding: number = 20,
): boolean {
  return (
    posA.x < posB.x + width + padding &&
    posA.x + width + padding > posB.x &&
    posA.y < posB.y + height + padding &&
    posA.y + height + padding > posB.y
  );
}

/**
 * Computes a smart, unoccupied coordinate for a newly created node.
 * If referenceNodeId is provided, places the new node adjacent to/below it.
 * Otherwise, finds the next available unoccupied coordinate in the canvas.
 */
export function calculateSmartPosition(
  existingNodes: Array<{ id: string; position: LayoutPosition }>,
  edges: Array<Pick<MapEdge, "source" | "target">> = [],
  referenceNodeId?: string | null,
  options: LayoutOptions = {},
): LayoutPosition {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!existingNodes || existingNodes.length === 0) {
    return { x: opts.startX, y: opts.startY };
  }

  // 1. If reference node is specified (or fallback to latest edge target), attempt placing adjacent
  const targetRefId = referenceNodeId ?? (edges.length > 0 ? edges[edges.length - 1]?.target : null);
  if (targetRefId) {
    const ref = existingNodes.find((n) => n.id === targetRefId);
    if (ref) {
      const candidateDown = {
        x: ref.position.x,
        y: ref.position.y + opts.nodeHeight + opts.verticalSpacing,
      };

      const hasCollisionDown = existingNodes.some((n) =>
        isColliding(candidateDown, n.position, opts.nodeWidth, opts.nodeHeight),
      );

      if (!hasCollisionDown) {
        return candidateDown;
      }

      // Try placing to the right of reference node
      const candidateRight = {
        x: ref.position.x + opts.nodeWidth + opts.horizontalSpacing,
        y: ref.position.y,
      };

      const hasCollisionRight = existingNodes.some((n) =>
        isColliding(candidateRight, n.position, opts.nodeWidth, opts.nodeHeight),
      );

      if (!hasCollisionRight) {
        return candidateRight;
      }
    }
  }

  // 2. Default search: find lowest rank or maximum bounding coordinate and place safely
  let maxY = -Infinity;
  let matchingX = opts.startX;

  for (const node of existingNodes) {
    if (node.position.y > maxY) {
      maxY = node.position.y;
      matchingX = node.position.x;
    }
  }

  const candidate = {
    x: matchingX,
    y: maxY + opts.nodeHeight + opts.verticalSpacing,
  };

  const hasCollision = existingNodes.some((n) =>
    isColliding(candidate, n.position, opts.nodeWidth, opts.nodeHeight),
  );

  if (!hasCollision) {
    return candidate;
  }

  // Spiral / grid search for first collision-free slot
  for (let ring = 1; ring <= 10; ring++) {
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        const testPos = {
          x: Math.max(opts.startX, candidate.x + dx * (opts.nodeWidth + opts.horizontalSpacing)),
          y: Math.max(opts.startY, candidate.y + dy * (opts.nodeHeight + opts.verticalSpacing)),
        };

        if (
          !existingNodes.some((n) =>
            isColliding(testPos, n.position, opts.nodeWidth, opts.nodeHeight),
          )
        ) {
          return testPos;
        }
      }
    }
  }

  return { x: candidate.x + 200, y: candidate.y };
}
