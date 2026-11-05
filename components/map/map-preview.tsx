"use client";

import { BibbleNode } from "@/components/bibble/bibble-node";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { mapToFlow } from "@/lib/map-utils";
import type { BibbleNodeData, LearningMap } from "@/types/map";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  useNodesState,
  type Node,
} from "@xyflow/react";
import { useCallback, useMemo, useState } from "react";

const nodeTypes = { bibble: BibbleNode };

export function MapPreview({ map, compact = false }: { map: LearningMap; compact?: boolean }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const initial = useMemo(() => mapToFlow(map, { animated: !prefersReducedMotion }), [map, prefersReducedMotion]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  // Only the interactive preview needs a mutable copy of the nodes. Cards and
  // the create page read them straight from the map data, so they stay in sync
  // with the prop without an effect that writes state on every change.
  const [interactiveNodes, , onNodesChange] = useNodesState<Node<BibbleNodeData>>(initial.nodes);
  const nodes = compact ? initial.nodes : interactiveNodes;

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node<BibbleNodeData>) => {
    setSelectedNode(node.id);
  }, []);

  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      if (!compact) onNodesChange(changes);
    },
    [compact, onNodesChange],
  );

  return (
    <div className={`map-preview cozy-wallpaper-pattern ${compact ? "map-preview-compact" : ""}`}>
      <ReactFlow
        nodes={nodes.map((node) => ({ ...node, selected: node.id === selectedNode }))}
        edges={initial.edges}
        nodeTypes={nodeTypes}
        onInit={(instance) => {
          const timer = setTimeout(() => {
            instance.fitView({
              padding: compact ? 0.35 : 0.25,
              duration: prefersReducedMotion ? 0 : undefined,
            });
          }, 40);
          return () => clearTimeout(timer);
        }}
        onNodeClick={handleNodeClick}
        onNodesChange={handleNodesChange}
        nodesDraggable={!compact}
        nodesConnectable={false}
        elementsSelectable
        panOnDrag
        zoomOnScroll
        fitView
        fitViewOptions={{
          padding: compact ? 0.35 : 0.25,
          duration: prefersReducedMotion ? 0 : undefined,
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Lines} color="color-mix(in srgb, var(--border) 60%, transparent)" gap={28} />
        {!compact && (
          <Controls
            showInteractive={false}
            fitViewOptions={{
              padding: compact ? 0.35 : 0.25,
              duration: prefersReducedMotion ? 0 : undefined,
            }}
          />
        )}
      </ReactFlow>
    </div>
  );
}
