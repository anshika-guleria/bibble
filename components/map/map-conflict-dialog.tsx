"use client";

import { useDialog } from "@/hooks/use-dialog";

export function MapConflictDialog({ busy, error, onResolve }: {
  busy: boolean;
  error: string | null;
  onResolve: (action: "reload" | "copy" | "overwrite") => void;
}) {
  // Escape cannot discard an unresolved conflict. Tab remains inside the dialog.
  const ref = useDialog<HTMLDivElement>(true, () => {});
  return <div className="map-conflict-backdrop">
    <div ref={ref} className="map-conflict-dialog" role="dialog" aria-modal="true" aria-labelledby="map-conflict-title" aria-describedby="map-conflict-description" aria-busy={busy} tabIndex={-1}>
      <span className="eyebrow">Your work is still here</span>
      <h2 id="map-conflict-title">This map changed in another tab or device.</h2>
      <p id="map-conflict-description">Saving has paused to protect both versions. Save a copy to keep your changes, or reload the latest version to replace this canvas.</p>
      {error && <p role="alert">{error}</p>}
      <div className="map-conflict-actions">
        <button data-autofocus disabled={busy} onClick={() => onResolve("copy")}>Save as copy</button>
        <button disabled={busy} onClick={() => onResolve("reload")}>Reload latest</button>
        <button className="map-conflict-overwrite" disabled={busy} onClick={() => onResolve("overwrite")}>Overwrite remote</button>
      </div>
      <p className="map-conflict-note">Overwrite replaces the latest saved graph with your current changes. If another save lands first, you will be asked again.</p>
    </div>
  </div>;
}
