"use client";

import { SHORTCUT_GROUPS } from "@/lib/map-shortcuts";
import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

const FOCUSABLE = "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" || event.key === "?") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key === "Tab" && dialogRef.current) {
        const items = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="dialog-content shortcuts-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shortcuts-header">
          <h3 id={titleId}>Keyboard shortcuts</h3>
          <button ref={closeRef} type="button" className="toolbar-button" onClick={onClose} aria-label="Close shortcuts guide">
            <X size={16} />
          </button>
        </div>
        {SHORTCUT_GROUPS.map((group) => (
          <section key={group.title} aria-label={group.title}>
            <h4>{group.title}</h4>
            <dl className="shortcuts-list">
              {group.shortcuts.map((shortcut) => (
                <div key={shortcut.description} className="shortcuts-row">
                  <dt>
                    {shortcut.keys.map((combo, i) => (
                      <span key={combo.join("+")}>
                        {i > 0 && <span className="shortcuts-or"> or </span>}
                        {combo.map((k, j) => (
                          <span key={k}>
                            {j > 0 && " + "}
                            <kbd>{k}</kbd>
                          </span>
                        ))}
                      </span>
                    ))}
                  </dt>
                  <dd>{shortcut.description}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <p className="shortcuts-note">Single-key shortcuts are ignored while you are typing in a text field.</p>
      </div>
    </div>
  );
}
