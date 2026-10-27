"use client";

import type { Bibble, BibbleStatus } from "@/types/map";
import { statusLabels } from "@/types/map";
import { BookOpen, Check, Circle, ExternalLink, Link2, Plus, Sparkles, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const statusOptions: Array<{ value: BibbleStatus; icon: typeof Circle }> = [
  { value: "not-started", icon: Circle },
  { value: "learning", icon: Sparkles },
  { value: "completed", icon: Check },
];

/** Safe progress: clamp to [0, 100], treat NaN/null/undefined as 0 */
function safeProgress(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

interface BibbleDetailsProps {
  bibble: Bibble;
  onClose: () => void;
  /** Push updated Bibble into the roadmap node state (immediate UI) */
  onChange?: (bibble: Bibble) => void;
  /**
   * Persist the map to localStorage.
   * Receives the freshly-saved draft so the parent can build
   * an accurate snapshot before React flushes setNodes().
   */
  onSave?: (draft: Bibble) => void;
}

export function BibbleDetails({ bibble, onClose, onChange, onSave }: BibbleDetailsProps) {
  // Local draft — isolated from roadmap until the user clicks Save Changes
  const [draft, setDraft] = useState<Bibble>(() => ({ ...bibble, progress: safeProgress(bibble.progress) }));
  const [savedFlash, setSavedFlash] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  // Move focus into the panel when it opens and give it back to whatever
  // opened it (usually the bibble) when it closes.
  useEffect(() => {
    const panel = panelRef.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel?.focus();
    return () => {
      // Only restore if focus is still in this panel (or was dropped to the body
      // because the panel was removed). If another panel already took focus, leave it.
      const active = document.activeElement;
      const focusLost = !active || active === document.body || !!panel?.contains(active);
      if (focusLost && opener?.isConnected) opener.focus();
    };
  }, []);

  const patch = (partial: Partial<Bibble>) => {
    setDraft((d) => ({ ...d, ...partial }));
    setIsDirty(true);
  };

  const handleSave = () => {
    if (isSaving) return;
    setIsSaving(true);

    // 1. Push draft into the roadmap node for immediate UI feedback
    onChange?.(draft);
    // 2. Persist — pass draft so parent avoids the stale-state race condition
    onSave?.(draft);
    // 3. Flash confirmation
    setSavedFlash(true);
    setIsDirty(false);
    window.setTimeout(() => {
      setSavedFlash(false);
      setIsSaving(false);
    }, 1800);
  };

  const setStatus = (value: BibbleStatus) =>
    patch({ status: value, progress: value === "completed" ? 100 : draft.progress });

  const setProgress = (raw: number) => {
    const p = safeProgress(raw);
    patch({
      progress: p,
      status: p === 100 ? "completed" : p > 0 ? "learning" : "not-started",
    });
  };

  return (
    <motion.aside
      initial={{ opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 28 }}
      transition={{ duration: 0.25 }}
      ref={panelRef}
      tabIndex={-1}
      className="details-panel"
      aria-label="Bibble details"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      {/* Scrollable content area */}
      <div className="details-panel-scroll">
        <div className="details-panel-header">
          <div>
            <span className="eyebrow">Bibble details{(isDirty || savedFlash) ? " ·" : ""}</span>
            {isDirty && <span className="details-unsaved-badge">unsaved</span>}
            {savedFlash && <span className="details-saved-badge">saved</span>}
            <h2>{draft.title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close details"><X size={18} /></button>
        </div>

        <label className="field-label" htmlFor="bibble-description">Description</label>
        <textarea
          id="bibble-description"
          value={draft.description ?? ""}
          onChange={(e) => patch({ description: e.target.value })}
        />

        <div className="details-section">
          <span className="field-label">Status</span>
          <div className="status-options">
            {statusOptions.map(({ value, icon: Icon }) => (
              <button
                key={value}
                className={`status-option ${draft.status === value ? "status-option-active" : ""}`}
                onClick={() => setStatus(value)}
              >
                <Icon size={15} /> {statusLabels[value]}
              </button>
            ))}
          </div>
        </div>

        <div className="details-section">
          <div className="details-section-title">
            <span className="field-label"><Link2 size={14} /> Resources</span>
            <button className="text-button"><Plus size={14} /> Add resource</button>
          </div>
          {(draft.resources ?? []).length
            ? draft.resources?.map((resource) => (
                <a className="resource-link" href={resource.url} key={resource.id} target="_blank" rel="noreferrer">
                  <BookOpen size={14} />{resource.label}<ExternalLink size={12} />
                </a>
              ))
            : <p className="empty-detail">Keep a favorite reference close by.</p>}
        </div>

        <div className="details-section">
          <label className="field-label" htmlFor="bibble-notes">Notes</label>
          <textarea
            id="bibble-notes"
            value={draft.notes ?? ""}
            placeholder="A small thought to remember..."
            onChange={(e) => patch({ notes: e.target.value })}
          />
        </div>

        <div className="details-progress">
          <div><span>Progress</span><strong>{draft.progress}%</strong></div>
          <input
            aria-label="Bibble progress"
            type="range"
            min="0"
            max="100"
            value={draft.progress}
            onChange={(e) => setProgress(Number(e.target.value))}
          />
        </div>

        {onChange && (
          <div className="details-save-wrap">
            <button
              id="bibble-save-changes"
              className={`details-save-btn${savedFlash ? " details-save-btn-saved" : ""}`}
              onClick={handleSave}
              disabled={isSaving}
              aria-label="Save changes to this bibble"
            >
              {savedFlash ? <><Check size={15} style={{ marginRight: 6 }} /> Changes saved</> : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      {/* Sticky footer — always visible */}
      {onChange && (
        <div className="details-panel-footer">
          <p className="footer-note">Changes are kept on this device</p>
        </div>
      )}
    </motion.aside>
  );
}
