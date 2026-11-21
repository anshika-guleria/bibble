import { describe, expect, it } from "vitest";
import { initialSaveState, saveReducer, type SaveEvent, type SaveState } from "./save-status";

const run = (events: SaveEvent[], from: SaveState = initialSaveState) => events.reduce(saveReducer, from);

describe("save status", () => {
  it("keeps saving paused after a conflict until explicitly resolved", () => {
    const state = run([{ type: "edit" }, { type: "save-start" }, { type: "save-conflict", version: 1 }, { type: "edit" }]);
    expect(state.status).toBe("conflict");
    expect(saveReducer(state, { type: "reload" }).status).toBe("saved");
  });
  it("starts saved", () => {
    expect(initialSaveState.status).toBe("saved");
  });

  it("moves from edit to saving to saved", () => {
    expect(run([{ type: "edit" }]).status).toBe("unsaved");
    expect(run([{ type: "edit" }, { type: "save-start" }]).status).toBe("saving");
    expect(run([{ type: "edit" }, { type: "save-start" }, { type: "save-success", version: 1 }]).status).toBe("saved");
  });

  it("stays unsaved when edits land during a save", () => {
    const state = run([{ type: "edit" }, { type: "save-start" }, { type: "edit" }, { type: "edit" }]);
    expect(state.status).toBe("saving");
    expect(saveReducer(state, { type: "save-success", version: 1 }).status).toBe("unsaved");
  });

  it("reports failures and recovers on retry", () => {
    const failed = run([{ type: "edit" }, { type: "save-start" }, { type: "save-failure", version: 1 }]);
    expect(failed.status).toBe("error");
    expect(run([{ type: "save-start" }, { type: "save-success", version: 1 }], failed).status).toBe("saved");
  });

  it("returns to unsaved on a new edit after an error", () => {
    const failed = run([{ type: "edit" }, { type: "save-start" }, { type: "save-failure", version: 1 }]);
    expect(saveReducer(failed, { type: "edit" }).status).toBe("unsaved");
  });

  it("ignores results from superseded saves", () => {
    const state = run([{ type: "edit" }, { type: "save-start" }, { type: "edit" }, { type: "save-start" }]);
    expect(saveReducer(state, { type: "save-success", version: 1 })).toBe(state);
    expect(saveReducer(state, { type: "save-success", version: 2 }).status).toBe("saved");
  });
});
