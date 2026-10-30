export type EditorShortcutAction = "add" | "fit" | "save" | "help";

export interface ShortcutEntry {
  keys: string[][];
  description: string;
}

export interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutEntry[];
}

/**
 * Shortcuts handled by Bibble itself. N, F, S and ? are matched by `getShortcutAction`;
 * undo and redo are handled in `learning-map.tsx`.
 */
export const EDITOR_SHORTCUTS: ShortcutGroup = {
  title: "Editor actions",
  shortcuts: [
    { keys: [["N"]], description: "Add a new bibble" },
    { keys: [["F"]], description: "Fit the whole map in view" },
    { keys: [["Ctrl", "S"], ["Cmd", "S"]], description: "Save the map" },
    { keys: [["Ctrl", "Z"], ["Cmd", "Z"]], description: "Undo the last change" },
    { keys: [["Ctrl", "Shift", "Z"], ["Cmd", "Shift", "Z"], ["Ctrl", "Y"]], description: "Redo" },
    { keys: [["?"]], description: "Open or close this shortcuts guide" },
  ],
};

/** Shortcuts provided by the React Flow canvas (@xyflow/react defaults). */
export const CANVAS_SHORTCUTS: ShortcutGroup = {
  title: "Canvas and bibbles",
  shortcuts: [
    { keys: [["Tab"]], description: "Move focus to the next bibble" },
    { keys: [["Enter"], ["Space"]], description: "Select the focused bibble" },
    { keys: [["Esc"]], description: "Deselect the focused bibble" },
    { keys: [["Arrow keys"]], description: "Move the selected bibble (hold Shift for bigger steps)" },
    { keys: [["Backspace"]], description: "Delete the selected bibbles or connections" },
    { keys: [["Shift", "drag"]], description: "Box-select several bibbles" },
    { keys: [["Ctrl", "click"], ["Cmd", "click"]], description: "Add or remove a bibble from the selection" },
    { keys: [["Space", "drag"]], description: "Pan the canvas" },
    { keys: [["Ctrl", "scroll"], ["Cmd", "scroll"]], description: "Zoom the canvas" },
  ],
};

export const SHORTCUT_GROUPS: ShortcutGroup[] = [EDITOR_SHORTCUTS, CANVAS_SHORTCUTS];

type KeyLike = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">;
type TargetLike = { tagName?: string; isContentEditable?: boolean } | null;

/** True when typing should not trigger editor shortcuts. */
export function isEditableTarget(target: TargetLike): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName?.toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/** Map a key event to an editor action, or null when it is not one of ours. */
export function getShortcutAction(event: KeyLike): EditorShortcutAction | null {
  const mod = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();
  if (mod) {
    return key === "s" && !event.altKey && !event.shiftKey ? "save" : null;
  }
  if (event.altKey) return null;
  if (event.key === "?") return "help";
  if (event.shiftKey) return null;
  if (key === "n") return "add";
  if (key === "f") return "fit";
  return null;
}
