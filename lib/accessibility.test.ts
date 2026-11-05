import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

describe("accessibility skip link and landmarks", () => {
  it("includes a Skip to main content link as the first focusable element in app/layout.tsx", () => {
    const layoutContent = readFileSync(
      resolve(__dirname, "../app/layout.tsx"),
      "utf8"
    );

    // Verify skip link is before children
    const skipLinkIndex = layoutContent.indexOf('href="#main-content"');
    const childrenIndex = layoutContent.indexOf("{children}");

    expect(skipLinkIndex).toBeGreaterThan(-1);
    expect(skipLinkIndex).toBeLessThan(childrenIndex);
    expect(layoutContent).toContain("Skip to main content");
    expect(layoutContent).toContain('className="skip-link"');
  });

  it("styles the skip link to be visually hidden until focused in app/globals.css", () => {
    const cssContent = readFileSync(
      resolve(__dirname, "../app/globals.css"),
      "utf8"
    );

    expect(cssContent).toContain(".skip-link {");
    expect(cssContent).toContain("clip-path: inset(50%);");
    expect(cssContent).toContain(".skip-link:focus,");
    expect(cssContent).toContain(".skip-link:focus-visible");
    expect(cssContent).toContain("position: fixed;");
  });

  it("labels navigation and footer landmarks", () => {
    const siteHeaderContent = readFileSync(
      resolve(__dirname, "../components/site-header.tsx"),
      "utf8"
    );
    expect(siteHeaderContent).toContain('aria-label="Primary navigation"');
    expect(siteHeaderContent).toContain('aria-label="Site header"');

    const homePageContent = readFileSync(
      resolve(__dirname, "../app/page.tsx"),
      "utf8"
    );
    expect(homePageContent).toContain('aria-label="Site footer"');
  });

  it("ensures every page contains matching id='main-content' on its main landmark", () => {
    const pageFiles = [
      "../app/page.tsx",
      "../app/explore/page.tsx",
      "../app/rooms/page.tsx",
      "../app/rooms/new/page.tsx",
      "../app/profile/page.tsx",
      "../app/progress/page.tsx",
      "../app/create/page.tsx",
      "../app/not-found.tsx",
      "../app/(auth)/auth-form.tsx",
      "../components/rooms/study-room-shell.tsx",
      "../components/rooms/custom-room-page.tsx",
      "../components/map/learning-map.tsx",
    ];

    for (const relativePath of pageFiles) {
      const content = readFileSync(resolve(__dirname, relativePath), "utf8");
      expect(content, `File ${relativePath} should have main landmark with id="main-content"`).toContain('id="main-content"');
      expect(content, `File ${relativePath} should have tabIndex={-1} for skip link focus`).toContain("tabIndex={-1}");
    }
  });

  it("prevents duplicate or nested main landmarks in map editor route", () => {
    const editMapContent = readFileSync(
      resolve(__dirname, "../app/map/[id]/edit/page.tsx"),
      "utf8"
    );

    // The edit route should wrap with <div className="map-page"> rather than <main>
    // to prevent nesting inside LearningMapCanvas which already renders <main id="main-content">
    expect(editMapContent).not.toContain('<main className="map-page">');
    expect(editMapContent).toContain('<div className="map-page">');
  });
});

