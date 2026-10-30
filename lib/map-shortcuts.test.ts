import { describe, expect, it } from "vitest";

import { CANVAS_SHORTCUTS, EDITOR_SHORTCUTS, SHORTCUT_GROUPS, getShortcutAction, isEditableTarget } from "./map-shortcuts";

const press = (key: string, extra: Partial<Record<"ctrlKey" | "metaKey" | "altKey" | "shiftKey", boolean>> = {}) => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...extra,
});

describe("getShortcutAction", () => {
  it("maps the single-key editor shortcuts", () => {
    expect(getShortcutAction(press("n"))).toBe("add");
    expect(getShortcutAction(press("N"))).toBe("add");
    expect(getShortcutAction(press("f"))).toBe("fit");
    expect(getShortcutAction(press("?", { shiftKey: true }))).toBe("help");
  });

  it("saves with Ctrl+S or Cmd+S", () => {
    expect(getShortcutAction(press("s", { ctrlKey: true }))).toBe("save");
    expect(getShortcutAction(press("S", { metaKey: true }))).toBe("save");
  });

  it("does not claim undo and redo (the editor handles those itself)", () => {
    expect(getShortcutAction(press("z", { ctrlKey: true }))).toBeNull();
    expect(getShortcutAction(press("z", { ctrlKey: true, shiftKey: true }))).toBeNull();
    expect(getShortcutAction(press("y", { ctrlKey: true }))).toBeNull();
  });

  it("ignores letters when other modifiers are held", () => {
    expect(getShortcutAction(press("n", { ctrlKey: true }))).toBeNull();
    expect(getShortcutAction(press("n", { altKey: true }))).toBeNull();
    expect(getShortcutAction(press("f", { shiftKey: true }))).toBeNull();
    expect(getShortcutAction(press("s", { ctrlKey: true, shiftKey: true }))).toBeNull();
    expect(getShortcutAction(press("s", { ctrlKey: true, altKey: true }))).toBeNull();
  });

  it("ignores keys that are not shortcuts", () => {
    ["a", "Enter", "Tab", "Escape", "Backspace", " ", "ArrowLeft"].forEach((key) => {
      expect(getShortcutAction(press(key))).toBeNull();
    });
  });
});

describe("isEditableTarget", () => {
  it("is true for fields where typing must not trigger shortcuts", () => {
    expect(isEditableTarget({ tagName: "INPUT" })).toBe(true);
    expect(isEditableTarget({ tagName: "textarea" })).toBe(true);
    expect(isEditableTarget({ tagName: "SELECT" })).toBe(true);
    expect(isEditableTarget({ tagName: "DIV", isContentEditable: true })).toBe(true);
  });

  it("is false for everything else", () => {
    expect(isEditableTarget({ tagName: "BUTTON" })).toBe(false);
    expect(isEditableTarget({ tagName: "DIV" })).toBe(false);
    expect(isEditableTarget({})).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe("shortcut guide content", () => {
  it("lists every shortcut the editor handles, including undo and redo", () => {
    const descriptions = EDITOR_SHORTCUTS.shortcuts.map((s) => s.description.toLowerCase()).join(" | ");
    ["add a new bibble", "fit", "save", "undo", "redo", "shortcuts guide"].forEach((term) => {
      expect(descriptions).toContain(term);
    });
  });

  it("gives every entry at least one key and a description", () => {
    SHORTCUT_GROUPS.forEach((group) => {
      expect(group.title.length).toBeGreaterThan(0);
      group.shortcuts.forEach((shortcut) => {
        expect(shortcut.description.length).toBeGreaterThan(3);
        expect(shortcut.keys.length).toBeGreaterThan(0);
        shortcut.keys.forEach((combo) => {
          expect(combo.length).toBeGreaterThan(0);
          combo.forEach((key) => expect(key.trim()).not.toBe(""));
        });
      });
    });
  });

  it("documents Mac alternatives next to the Ctrl ones", () => {
    const withCtrl = [...EDITOR_SHORTCUTS.shortcuts, ...CANVAS_SHORTCUTS.shortcuts].filter((s) => s.keys.some((c) => c.includes("Ctrl")));
    withCtrl.forEach((shortcut) => {
      if (shortcut.description.toLowerCase().includes("redo")) return; // Ctrl+Y has no Cmd twin
      expect(shortcut.keys.some((c) => c.includes("Cmd"))).toBe(true);
    });
  });

  it("has no duplicate shortcuts across the two groups", () => {
    const seen = new Set<string>();
    SHORTCUT_GROUPS.flatMap((g) => g.shortcuts).flatMap((s) => s.keys).forEach((combo) => {
      const id = combo.join("+");
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    });
  });
});
