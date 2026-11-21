export type SaveStatus = "saved" | "unsaved" | "saving" | "error" | "conflict";

export type SaveState = {
  status: SaveStatus;
  /** Incremented on every committed edit. */
  version: number;
  /** Version captured by the save currently in flight, if any. */
  savingVersion: number | null;
};

export type SaveEvent =
  | { type: "edit" }
  | { type: "save-start" }
  | { type: "save-success"; version: number }
  | { type: "save-failure"; version: number }
  | { type: "save-conflict"; version: number }
  | { type: "reload" };

export const initialSaveState: SaveState = { status: "saved", version: 0, savingVersion: null };

/**
 * Tracks whether the editor's content has reached storage.
 * Edits made while a save is in flight keep the map "unsaved" once that save finishes.
 */
export function saveReducer(state: SaveState, event: SaveEvent): SaveState {
  switch (event.type) {
    case "edit": {
      const version = state.version + 1;
      return { ...state, version, status: state.status === "saving" ? "saving" : state.status === "conflict" ? "conflict" : "unsaved" };
    }
    case "reload":
      return { ...state, status: "saved", savingVersion: null };
    case "save-conflict":
      if (state.savingVersion !== event.version) return state;
      return { ...state, status: "conflict", savingVersion: null };
    case "save-start":
      return { ...state, status: "saving", savingVersion: state.version };
    case "save-success": {
      // Ignore results from saves that were superseded by a newer one.
      if (state.savingVersion !== event.version) return state;
      return { ...state, savingVersion: null, status: state.version === event.version ? "saved" : "unsaved" };
    }
    case "save-failure": {
      if (state.savingVersion !== event.version) return state;
      return { ...state, savingVersion: null, status: "error" };
    }
  }
}

export const saveStatusLabel: Record<SaveStatus, string> = {
  saved: "All changes saved",
  unsaved: "Unsaved changes",
  saving: "Saving…",
  error: "Couldn't save. Try again",
  conflict: "A newer version is available",
};
