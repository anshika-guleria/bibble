"use client";

import { AlertCircle, Check, Download, History, Keyboard, LayoutGrid, Loader2, Plus, Redo2, Save, Undo2, ZoomIn } from "lucide-react";
import { saveStatusLabel, type SaveStatus } from "@/lib/maps/save-status";

export function MapToolbar({ onAdd, onUndo, onRedo, onFit, onAutoLayout, onExport, onSave, onShowHistory, onShowShortcuts, saveStatus, canUndo, canRedo }: {
  onAdd: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onFit: () => void;
  onAutoLayout?: () => void;
  onExport?: () => void;
  onSave: () => void;
  onShowHistory?: () => void;
  onShowShortcuts: () => void;
  saveStatus: SaveStatus;
  canUndo: boolean;
  canRedo: boolean;
}) {
  return <div className="map-toolbar">
    <button className="toolbar-primary" onClick={onAdd} aria-keyshortcuts="N"><Plus size={17} /> Add bibble</button>
    <span className="toolbar-divider" />
    <button className="toolbar-button" onClick={onUndo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)"><Undo2 size={16} /></button>
    <button className="toolbar-button" onClick={onRedo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z or Ctrl+Y)"><Redo2 size={16} /></button>
    <button className="toolbar-button toolbar-text-button" onClick={onFit} aria-keyshortcuts="F"><ZoomIn size={16} /> Fit view</button>
    {onAutoLayout && (
      <button className="toolbar-button toolbar-text-button" onClick={onAutoLayout} aria-label="Auto layout" title="Reformat roadmap into clean hierarchical layers" data-testid="toolbar-auto-layout"><LayoutGrid size={16} /> Auto layout</button>
    )}
    {onShowHistory && (
      <button className="toolbar-button toolbar-text-button" onClick={onShowHistory} aria-label="Revision history" title="View map revision history" data-testid="toolbar-history"><History size={16} /> History</button>
    )}
    {onExport && (
      <button className="toolbar-button toolbar-text-button" onClick={onExport} aria-label="Export map" title="Export map (.bibble.json)"><Download size={16} /> Export map</button>
    )}
    <button className="toolbar-button" onClick={onShowShortcuts} aria-label="Keyboard shortcuts" aria-haspopup="dialog" aria-keyshortcuts="?" title="Keyboard shortcuts (?)"><Keyboard size={16} /></button>
    <span className="toolbar-spacer" />
      <span className={`save-indicator save-indicator-${saveStatus}`} role="status" aria-live="polite" aria-atomic="true" data-testid="save-indicator">
      {saveStatus === "saving" && <Loader2 size={14} className="save-indicator-spin" aria-hidden="true" />}
      {saveStatus === "saved" && <Check size={14} aria-hidden="true" />}
      {saveStatus === "error" && <AlertCircle size={14} aria-hidden="true" />}
      <span>{saveStatusLabel[saveStatus]}</span>
    </span>
    <button className="toolbar-save" onClick={onSave} disabled={saveStatus === "saving" || saveStatus === "conflict"} aria-keyshortcuts="Control+S Meta+S"><Save size={16} />{saveStatus === "error" ? "Retry" : "Save"}</button>
  </div>;
}
