"use client";

import { BibbleDetails } from "@/components/bibble/bibble-details";
import { BibbleNode } from "@/components/bibble/bibble-node";
import { MapToolbar } from "@/components/map/map-toolbar";
import { MapHeader } from "@/components/map/map-header";
import { ShortcutsDialog } from "@/components/map/shortcuts-dialog";
import { getShortcutAction, isEditableTarget } from "@/lib/map-shortcuts";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { flowToMap, mapToFlow } from "@/lib/map-utils";
import { saveMapToSupabase } from "@/lib/maps/persistence";
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
  type OnDelete,
  type OnNodeDrag,
  type ReactFlowInstance,
} from "@xyflow/react";
import { ArrowLeft, Star, Trash2 } from "lucide-react";
import { AnimatePresence } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const nodeTypes = { bibble: BibbleNode };

const HISTORY_LIMIT = 50;

type FlowSnapshot = {
  nodes: Node<BibbleNodeData>[];
  edges: Edge[];
};

type EditHistory = {
  entries: FlowSnapshot[];
  signatures: string[];
  index: number;
};

/** Deep-copy a node so history entries can never mutate with the live canvas. */
const cloneNode = (node: Node<BibbleNodeData>): Node<BibbleNodeData> => ({
  ...node,
  dragging: false,
  position: { ...node.position },
  measured: node.measured ? { ...node.measured } : node.measured,
  style: node.style ? { ...node.style } : node.style,
  data: {
    ...node.data,
    position: { ...node.data.position },
    resources: node.data.resources?.map((resource) => ({ ...resource })),
  } as BibbleNodeData,
});

const cloneEdge = (edge: Edge): Edge => ({
  ...edge,
  style: edge.style ? { ...edge.style } : edge.style,
});

const cloneSnapshot = (nodes: Node<BibbleNodeData>[], edges: Edge[]): FlowSnapshot => ({
  nodes: nodes.map(cloneNode),
  edges: edges.map(cloneEdge),
});

/** Canonical signature of the persisted map — ignores selection, dragging and measurement updates. */
const snapshotSignature = (nodes: Node<BibbleNodeData>[], edges: Edge[]): string =>
  JSON.stringify({
    bibbles: nodes.map((node) => ({ ...node.data, position: node.position })),
    edges: edges.map(({ id, source, target }) => ({ id, source, target })),
  });

const createHistory = (nodes: Node<BibbleNodeData>[], edges: Edge[]): EditHistory => ({
  entries: [cloneSnapshot(nodes, edges)],
  signatures: [snapshotSignature(nodes, edges)],
  index: 0,
});

export function LearningMapCanvas({ initialMap, editable = false, preferInitialMap = false }: { initialMap: LearningMap; editable?: boolean; preferInitialMap?: boolean }) {
  const initialFlow = useMemo(() => mapToFlow(initialMap), [initialMap]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<BibbleNodeData>>(initialFlow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlow.edges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [storedMaps, setStoredMaps, hydrated] = useLocalStorage<LearningMap[]>("bibble-maps", []);
  const flowRef = useRef<ReactFlowInstance<Node<BibbleNodeData>, Edge> | null>(null);
  const historyRef = useRef<EditHistory | null>(null);
  const loadedMapIdRef = useRef<string | null>(null);

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

  // Load the persisted map once per map id and use it as the clean history baseline.
  useEffect(() => {
    if (!hydrated) return;
    if (loadedMapIdRef.current === initialMap.id) return;
    loadedMapIdRef.current = initialMap.id;

    const savedMap = preferInitialMap ? undefined : storedMaps.find((map) => map.id === initialMap.id);
    const flow = savedMap ? mapToFlow(savedMap) : initialFlow;
    const nextNodes = flow.nodes.map(cloneNode);
    const nextEdges = flow.edges.map(cloneEdge);

    nodesRef.current = nextNodes;
    edgesRef.current = nextEdges;
    setNodes(nextNodes);
    setEdges(nextEdges);

    if (editable) historyRef.current = createHistory(nextNodes, nextEdges);
  }, [editable, hydrated, initialFlow, initialMap.id, preferInitialMap, setEdges, setNodes, storedMaps]);

  /** Append a snapshot unless it matches the current history entry. */
  const recordHistory = useCallback(
    (nextNodes: Node<BibbleNodeData>[], nextEdges: Edge[]) => {
      if (!editable) return;
      const history = historyRef.current;
      if (!history) return;

      const signature = snapshotSignature(nextNodes, nextEdges);
      if (signature === history.signatures[history.index]) return;

      // A new edit after undo discards the obsolete redo branch.
      const entries = history.entries.slice(0, history.index + 1);
      const signatures = history.signatures.slice(0, history.index + 1);
      entries.push(cloneSnapshot(nextNodes, nextEdges));
      signatures.push(signature);

      const overflow = Math.max(0, entries.length - HISTORY_LIMIT);
      if (overflow > 0) {
        entries.splice(0, overflow);
        signatures.splice(0, overflow);
      }

      history.entries = entries;
      history.signatures = signatures;
      history.index = entries.length - 1;
      setCanUndo(history.index > 0);
      setCanRedo(false);
    },
    [editable],
  );

  const restoreSnapshot = useCallback(
    (snapshot: FlowSnapshot) => {
      const nextNodes = snapshot.nodes.map(cloneNode);
      const nextEdges = snapshot.edges.map(cloneEdge);
      nodesRef.current = nextNodes;
      edgesRef.current = nextEdges;
      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelectedId((current) => (current && nextNodes.some((node) => node.id === current) ? current : null));
    },
    [setEdges, setNodes],
  );

  const undo = useCallback(() => {
    const history = historyRef.current;
    if (!editable || !history || history.index <= 0) return;
    history.index -= 1;
    restoreSnapshot(history.entries[history.index]);
    setCanUndo(history.index > 0);
    setCanRedo(true);
  }, [editable, restoreSnapshot]);

  const redo = useCallback(() => {
    const history = historyRef.current;
    if (!editable || !history || history.index >= history.entries.length - 1) return;
    history.index += 1;
    restoreSnapshot(history.entries[history.index]);
    setCanUndo(true);
    setCanRedo(history.index < history.entries.length - 1);
  }, [editable, restoreSnapshot]);

  useEffect(() => {
    if (!editable) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName;
        if (target.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") return;
      }

      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (key === "y") {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editable, redo, undo]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const nextEdges = addEdge(
        { ...connection, type: "smoothstep", animated: true, style: { stroke: "var(--canvas-edge)", strokeWidth: 2 } },
        edgesRef.current,
      );
      if (nextEdges === edgesRef.current) return;
      edgesRef.current = nextEdges;
      setEdges(nextEdges);
      recordHistory(nodesRef.current, nextEdges);
    },
    [recordHistory, setEdges],
  );

  /** Update a single node in React state (immediate UI feedback) and record one committed edit. */
  const updateSelected = (bibble: Bibble) => {
    const nextNodes = nodesRef.current.map((node) =>
      node.id === bibble.id ? { ...node, data: bibble as BibbleNodeData } : node,
    );
    nodesRef.current = nextNodes;
    setNodes(nextNodes);
    recordHistory(nextNodes, edgesRef.current);
  };

  /**
   * Persist the map to localStorage.
   * Accepts an optional `updatedBibble` so the save can include a just-edited
   * bibble before React flushes the setNodes() call (avoids stale-state race).
   */
  const saveMap = useCallback(async (updatedBibble?: Bibble) => {
    // Build node list with the updated bibble merged in (if provided)
    const currentNodes = updatedBibble
      ? nodesRef.current.map((n) => n.id === updatedBibble.id ? { ...n, data: updatedBibble as BibbleNodeData } : n)
      : nodesRef.current;
    const next = flowToMap(initialMap, currentNodes, edgesRef.current);
    setStoredMaps((current) => [...current.filter((m) => m.id !== next.id), next]);
    setSaveError(null);
    const persisted = await saveMapToSupabase(next);
    if (!persisted) {
      setSaved(false);
      setSaveError("Your local changes are saved, but Supabase could not be updated. Please try again.");
      return;
    }
    setSaved(persisted);
    if (persisted) window.setTimeout(() => setSaved(false), 1800);
  }, [initialMap, setStoredMaps]);

  const addBibble = () => {
    const id = `bibble-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const position = { x: 320, y: 180 };
    const nextNodes: Node<BibbleNodeData>[] = [
      ...nodesRef.current,
      {
        id,
        type: "bibble",
        position,
        width: 155,
        height: 96,
        measured: { width: 155, height: 96 },
        data: { id, title: "New bibble", description: "Give this idea a little shape.", status: "not-started", progress: 0, position: { ...position } } as BibbleNodeData,
      },
    ];
    nodesRef.current = nextNodes;
    setNodes(nextNodes);
    recordHistory(nextNodes, edgesRef.current);
    setSelectedId(id);
  };

  /** One completed drag is one history step; React Flow fires this after the drag settles. */
  const handleNodeDragStop = useCallback<OnNodeDrag<Node<BibbleNodeData>>>(
    (_event, _node, draggedNodes) => {
      if (!editable) return;
      const finalPositions = new Map(draggedNodes.map((dragged) => [dragged.id, dragged.position]));
      const nextNodes = nodesRef.current.map((node) => {
        const finalPosition = finalPositions.get(node.id);
        return finalPosition ? { ...node, position: { ...finalPosition }, dragging: false } : node;
      });
      nodesRef.current = nextNodes;
      setNodes(nextNodes);
      recordHistory(nextNodes, edgesRef.current);
    },
    [editable, recordHistory, setNodes],
  );

  /** React Flow reports keyboard and programmatic deletions here — record nodes and their edges once. */
  const handleDelete = useCallback<OnDelete<Node<BibbleNodeData>, Edge>>(
    ({ nodes: deletedNodes, edges: deletedEdges }) => {
      if (!editable) return;
      const nodeIds = new Set(deletedNodes.map((node) => node.id));
      const edgeIds = new Set(deletedEdges.map((edge) => edge.id));
      const nextNodes = nodesRef.current.filter((node) => !nodeIds.has(node.id));
      const nextEdges = edgesRef.current.filter(
        (edge) => !edgeIds.has(edge.id) && !nodeIds.has(edge.source) && !nodeIds.has(edge.target),
      );
      nodesRef.current = nextNodes;
      edgesRef.current = nextEdges;
      recordHistory(nextNodes, nextEdges);
      setSelectedId((current) => (current && nodeIds.has(current) ? null : current));
    },
    [editable, recordHistory],
  );

  const deleteBibble = (id: string) => {
    setSelectedId(null);
    void flowRef.current?.deleteElements({ nodes: [{ id }] });
  };

  const fitView = () => flowRef.current?.fitView({ padding: 0.22 });

  const actionsRef = useRef({ add: addBibble, fit: fitView, save: () => saveMap() });
  useEffect(() => {
    actionsRef.current = { add: addBibble, fit: fitView, save: () => saveMap() };
  });

  useEffect(() => {
    if (!editable) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || isEditableTarget(event.target as HTMLElement | null)) return;
      const action = getShortcutAction(event);
      if (!action) return;
      event.preventDefault();
      if (action === "help") setShowShortcuts(true);
      else actionsRef.current[action]();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editable]);

  const closeShortcuts = useCallback(() => setShowShortcuts(false), []);

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
             onUndo={undo}
             onRedo={redo}
             onFit={fitView}
             onSave={() => saveMap()}
             onShowShortcuts={() => setShowShortcuts(true)}
             saved={saved}
             canUndo={canUndo}
             canRedo={canRedo}
           />
         )}
         <div className="map-canvas-wrap">
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
        onNodeDragStop={editable ? handleNodeDragStop : undefined}
        onDelete={editable ? handleDelete : undefined}
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
    {saveError && <p role="alert" style={{ margin: "10px 0", color: "var(--danger, #b42318)" }}>{saveError}</p>}
    <AnimatePresence>{selected && <BibbleDetails key={selected.id} bibble={selected} onClose={() => setSelectedId(null)} onChange={updateSelected} onSave={saveMap} />}</AnimatePresence>
    {editable && selected && <button className="delete-bibble" onClick={() => deleteBibble(selected.id)}><Trash2 size={15} /> Delete bibble</button>}
    {editable && showShortcuts && <ShortcutsDialog onClose={closeShortcuts} />}
    {editable && <div className="editor-back-link"><ArrowLeft size={15} /> <span>Changes are kept on this device</span></div>}
  </div>
</main>
);
}
