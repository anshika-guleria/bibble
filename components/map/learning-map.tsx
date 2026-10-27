"use client";

import { BibbleDetails } from "@/components/bibble/bibble-details";
import { BibbleNode } from "@/components/bibble/bibble-node";
import { MapToolbar } from "@/components/map/map-toolbar";
import { MapHeader } from "@/components/map/map-header";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { flowToMap, mapToFlow } from "@/lib/map-utils";
import { getMapProgress } from "@/data/sample-maps";
import type { Bibble, BibbleNodeData, LearningMap } from "@/types/map";
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react";
import { ArrowLeft, Star, Trash2 } from "lucide-react";
import { AnimatePresence } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const nodeTypes = { bibble: BibbleNode };

export function LearningMapCanvas({ initialMap, editable = false }: { initialMap: LearningMap; editable?: boolean }) {
  const initialFlow = useMemo(() => mapToFlow(initialMap), [initialMap]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<BibbleNodeData>>(initialFlow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlow.edges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [storedMaps, setStoredMaps, hydrated] = useLocalStorage<LearningMap[]>("bibble-maps", []);
  const flowRef = useRef<ReactFlowInstance<Node<BibbleNodeData>, Edge> | null>(null);

  // Keep refs updated for save callback
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const selected = nodes.find((node) => node.id === selectedId)?.data as BibbleNodeData | undefined;

  // Load from localStorage once hydrated
  useEffect(() => {
    if (hydrated) {
      const savedMap = storedMaps.find((m) => m.id === initialMap.id);
      if (savedMap) {
        const flow = mapToFlow(savedMap);
        setNodes(flow.nodes);
        setEdges(flow.edges);
      }
    }
  }, [hydrated, initialMap.id, setEdges, setNodes, storedMaps]);

  const onConnect = useCallback((connection: Connection) => setEdges((current) => addEdge({ ...connection, type: "smoothstep", animated: true, style: { stroke: "var(--canvas-edge)", strokeWidth: 2 } }, current)), [setEdges]);

  /** Update a single node in React state (immediate UI feedback) */
  const updateSelected = (bibble: Bibble) =>
    setNodes((current) => current.map((node) => node.id === bibble.id ? { ...node, data: bibble as BibbleNodeData } : node));

  /**
   * Persist the map to localStorage.
   * Accepts an optional `updatedBibble` so the save can include a just-edited
   * bibble before React flushes the setNodes() call (avoids stale-state race).
   */
  const saveMap = useCallback((updatedBibble?: Bibble) => {
    // Build node list with the updated bibble merged in (if provided)
    const currentNodes = updatedBibble
      ? nodesRef.current.map((n) => n.id === updatedBibble.id ? { ...n, data: updatedBibble as BibbleNodeData } : n)
      : nodesRef.current;
    const next = flowToMap(initialMap, currentNodes, edgesRef.current);
    setStoredMaps((current) => [...current.filter((m) => m.id !== next.id), next]);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }, [initialMap, setStoredMaps]);

  const addBibble = () => {
    const id = `bibble-${Date.now()}`;
    setNodes((current) => [
      ...current,
      {
        id,
        type: "bibble",
        position: { x: 320, y: 180 },
        width: 155,
        height: 96,
        measured: { width: 155, height: 96 },
        data: { id, title: "New bibble", description: "Give this idea a little shape.", status: "not-started", progress: 0, position: { x: 320, y: 180 } } as BibbleNodeData,
      },
    ]);
    setSelectedId(id);
  };

  /**
   * React Flow selects a focused node on Enter/Space but never calls onNodeClick,
   * so open the details panel here. Escape closes it again.
   */
  const handleCanvasKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      setSelectedId(null);
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") return;
    const nodeEl = (event.target as HTMLElement).closest<HTMLElement>(".react-flow__node");
    const id = nodeEl?.dataset.id;
    if (!id) return;
    event.preventDefault();
    setSelectedId(id);
  };

  const fitView = () => flowRef.current?.fitView({ padding: 0.22 });

  const currentMap = flowToMap(initialMap, nodes, edges);
  const progress = getMapProgress(currentMap);

  return (
     <main className={`map-page ${editable ? "learning-map-editor" : ""}`}>
       {!editable && <MapHeader map={currentMap} onSave={() => saveMap()} saved={saved} />}
       {!editable && (
         <div className="map-page-copy">
           <Link href="/explore" className="back-link">
             <ArrowLeft size={15} /> All maps
           </Link>
           <p>{currentMap.description}</p>
           <span>
             {progress}% grown · {currentMap.bibbles.length} bibbles
           </span>
         </div>
       )}
       <div className={`learning-map-shell ${editable ? "learning-map-editor" : ""}`}>
         {editable && (
           <MapToolbar
             onAdd={addBibble}
             onUndo={() => undefined}
             onRedo={() => undefined}
             onFit={fitView}
             onSave={() => saveMap()}
             saved={saved}
           />
         )}
         <div className="map-canvas-wrap" onKeyDown={handleCanvasKeyDown}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={(instance) => {
          flowRef.current = instance;
          setTimeout(() => {
            instance.fitView({ padding: 0.22 });
          }, 40);
        }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={editable ? onConnect : undefined}
        onNodeClick={(_, node) => setSelectedId(node.id)}
        onPaneClick={() => setSelectedId(null)}
        nodesDraggable={editable}
        nodesConnectable={editable}
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.22 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Lines} color="color-mix(in srgb, var(--border) 60%, transparent)" gap={28} />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap position="bottom-right" nodeColor="var(--canvas-node)" />
      </ReactFlow>
      {!editable && <div className="map-canvas-hint"><Star size={14} /> Click a bibble to explore it</div>}
    </div>
    <AnimatePresence>{selected && <BibbleDetails key={selected.id} bibble={selected} onClose={() => setSelectedId(null)} onChange={updateSelected} onSave={saveMap} />}</AnimatePresence>
    {editable && selected && <button className="delete-bibble" onClick={() => { setNodes((current) => current.filter((node) => node.id !== selected.id)); setSelectedId(null); }}><Trash2 size={15} /> Delete bibble</button>}
    {editable && <div className="editor-back-link"><ArrowLeft size={15} /> <span>Changes are kept on this device</span></div>}
  </div>
</main>
);
}
