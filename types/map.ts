export type BibbleStatus = "not-started" | "learning" | "completed";

export interface MapPosition {
  x: number;
  y: number;
}

export interface MapResource {
  id: string;
  label: string;
  url: string;
}

export interface Bibble {
  id: string;
  title: string;
  description?: string;
  status: BibbleStatus;
  progress: number;
  position: MapPosition;
  resources?: MapResource[];
  notes?: string;
  readinessState?: "completed" | "in-progress" | "root" | "ready" | "locked";
  missingPrereqsCount?: number;
}

export type BibbleNodeData = Bibble & Record<string, unknown>;

export interface MapEdge {
  id: string;
  source: string;
  target: string;
}

export interface LearningMap {
  /** Database revision (absent only for a new/unsaved map). */
  version?: number;
  id: string;
  title: string;
  description: string;
  category: string;
  bibbles: Bibble[];
  edges: MapEdge[];
  accent: string;
}

export const statusLabels: Record<BibbleStatus, string> = {
  "not-started": "Not started",
  learning: "Learning",
  completed: "Completed",
};
