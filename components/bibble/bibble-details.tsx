"use client";

import type { Bibble, BibbleStatus } from "@/types/map";
import { statusLabels } from "@/types/map";
import { createResourceId, isValidResourceUrl, validateResourceUrl } from "@/lib/resource-url";
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
  // Unsaved draft, isolated from the roadmap until the user clicks Save Changes.
  // While clean the panel mirrors the committed bibble, so undo/redo shows up here too.
  const [draft, setDraft] = useState<Bibble | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [newResourceLabel, setNewResourceLabel] = useState("");
  const [newResourceUrl, setNewResourceUrl] = useState("");
  const [resourceUrlError, setResourceUrlError] = useState<string | null>(null);
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

  const committed = { ...bibble, progress: safeProgress(bibble.progress) };
  const value = draft ?? committed;
  const safeResources = (value.resources ?? []).filter((r) => isValidResourceUrl(r.url));
  const isDirty = draft !== null;

  const patch = (partial: Partial<Bibble>) => {
    setDraft((current) => ({ ...(current ?? committed), ...partial }));
  };

  const handleOpenAddResource = () => {
    setIsAddingResource(true);
    setNewResourceLabel("");
    setNewResourceUrl("");
    setResourceUrlError(null);
  };

  const handleCancelAddResource = () => {
    setIsAddingResource(false);
    setNewResourceLabel("");
    setNewResourceUrl("");
    setResourceUrlError(null);
  };

  const handleSaveResource = () => {
    const validation = validateResourceUrl(newResourceUrl);
    if (!validation.valid) {
      setResourceUrlError(validation.error || "Please enter a valid URL.");
      return;
    }

    const trimmedLabel = newResourceLabel.trim();
    const finalLabel = trimmedLabel || validation.url!;
    const newResource = {
      id: createResourceId(),
      label: finalLabel,
      url: validation.url!,
    };

    const updated = [...(value.resources ?? []), newResource];
    patch({ resources: updated });
    setIsAddingResource(false);
    setNewResourceLabel("");
    setNewResourceUrl("");
    setResourceUrlError(null);
  };

  const handleRemoveResource = (id: string) => {
    const updated = (value.resources ?? []).filter((r) => r.id !== id);
    patch({ resources: updated });
  };

  const handleSave = () => {
    if (isSaving) return;

    if (isAddingResource && newResourceUrl.trim()) {
      const validation = validateResourceUrl(newResourceUrl);
      if (!validation.valid) {
        setResourceUrlError(validation.error || "Please enter a valid URL.");
        return;
      }
    }

    // Verify all existing resources have valid URLs before saving
    for (const res of value.resources ?? []) {
      const validation = validateResourceUrl(res.url);
      if (!validation.valid) {
        setResourceUrlError(validation.error || "One or more resources has an invalid link.");
        return;
      }
    }

    setIsSaving(true);

    // One Save Changes = one committed map edit (the parent records the history step).
    onChange?.(value);
    onSave?.(value);
    setDraft(null);
    setSavedFlash(true);
    window.setTimeout(() => {
      setSavedFlash(false);
      setIsSaving(false);
    }, 1800);
  };

  const setStatus = (status: BibbleStatus) =>
    patch({ status, progress: status === "completed" ? 100 : value.progress });

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
            <h2>{value.title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close details"><X size={18} /></button>
        </div>

        <label className="field-label" htmlFor="bibble-description">Description</label>
        <textarea
          id="bibble-description"
          value={value.description ?? ""}
          onChange={(e) => patch({ description: e.target.value })}
        />

        <div className="details-section">
          <span className="field-label">Status</span>
          <div className="status-options">
            {statusOptions.map(({ value: statusValue, icon: Icon }) => (
              <button
                key={statusValue}
                className={`status-option ${value.status === statusValue ? "status-option-active" : ""}`}
                onClick={() => setStatus(statusValue)}
              >
                <Icon size={15} /> {statusLabels[statusValue]}
              </button>
            ))}
          </div>
        </div>

        <div className="details-section">
          <div className="details-section-title">
            <span className="field-label"><Link2 size={14} /> Resources</span>
            {onChange && !isAddingResource && (
              <button
                type="button"
                className="text-button"
                onClick={handleOpenAddResource}
              >
                <Plus size={14} /> Add resource
              </button>
            )}
          </div>

          {isAddingResource && (
            <div className="resource-add-form">
              <label className="field-label" htmlFor="new-resource-title">Resource title</label>
              <input
                id="new-resource-title"
                type="text"
                placeholder="e.g. Official Docs"
                value={newResourceLabel}
                onChange={(e) => setNewResourceLabel(e.target.value)}
              />
              <label className="field-label" htmlFor="new-resource-url">Resource link (http/https)</label>
              <input
                id="new-resource-url"
                type="text"
                placeholder="https://example.com"
                value={newResourceUrl}
                onChange={(e) => {
                  setNewResourceUrl(e.target.value);
                  if (resourceUrlError) setResourceUrlError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveResource();
                  }
                }}
              />
              {resourceUrlError && (
                <p className="resource-inline-error" role="alert">
                  {resourceUrlError}
                </p>
              )}
              <div className="resource-add-actions">
                <button
                  type="button"
                  className="text-button"
                  onClick={handleCancelAddResource}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="button-primary button-small"
                  onClick={handleSaveResource}
                >
                  Save resource
                </button>
              </div>
            </div>
          )}

          {safeResources.length ? (
            <div className="resource-list">
              {safeResources.map((resource) => (
                <div key={resource.id} className="resource-item">
                  <a
                    className="resource-link"
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <BookOpen size={14} />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {resource.label}
                    </span>
                    <ExternalLink size={12} />
                  </a>
                  {onChange && (
                    <button
                      type="button"
                      className="resource-delete-btn"
                      onClick={() => handleRemoveResource(resource.id)}
                      aria-label={`Remove resource ${resource.label}`}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            !isAddingResource && <p className="empty-detail">Keep a favorite reference close by.</p>
          )}
        </div>

        <div className="details-section">
          <label className="field-label" htmlFor="bibble-notes">Notes</label>
          <textarea
            id="bibble-notes"
            value={value.notes ?? ""}
            placeholder="A small thought to remember..."
            onChange={(e) => patch({ notes: e.target.value })}
          />
        </div>

        <div className="details-progress">
          <div><span>Progress</span><strong>{value.progress}%</strong></div>
          <input
            aria-label="Bibble progress"
            type="range"
            min="0"
            max="100"
            value={value.progress}
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
