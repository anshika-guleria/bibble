import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { mapToFlow } from "./map-utils";
import { sampleMaps } from "@/data/sample-maps";
import { usePrefersReducedMotion, useReducedMotion } from "@/hooks/use-reduced-motion";

describe("reduced motion support", () => {
  const sampleMap = sampleMaps[0];

  describe("mapToFlow edge animation", () => {
    it("defaults to animated edges when reduced motion is not requested", () => {
      const flow = mapToFlow(sampleMap);
      expect(flow.edges.length).toBeGreaterThan(0);
      for (const edge of flow.edges) {
        expect(edge.animated).toBe(true);
      }
    });

    it("disables edge animation when animated is set to false", () => {
      const flow = mapToFlow(sampleMap, { animated: false });
      expect(flow.edges.length).toBeGreaterThan(0);
      for (const edge of flow.edges) {
        expect(edge.animated).toBe(false);
      }
    });

    it("preserves all other edge properties and nodes when animated is false", () => {
      const flowAnimated = mapToFlow(sampleMap, { animated: true });
      const flowReduced = mapToFlow(sampleMap, { animated: false });

      expect(flowReduced.nodes).toEqual(flowAnimated.nodes);
      expect(flowReduced.edges.length).toBe(flowAnimated.edges.length);
      for (let i = 0; i < flowReduced.edges.length; i++) {
        expect(flowReduced.edges[i].id).toBe(flowAnimated.edges[i].id);
        expect(flowReduced.edges[i].source).toBe(flowAnimated.edges[i].source);
        expect(flowReduced.edges[i].target).toBe(flowAnimated.edges[i].target);
        expect(flowReduced.edges[i].type).toBe("smoothstep");
      }
    });
  });

  describe("globals.css prefers-reduced-motion rules", () => {
    const cssPath = path.resolve(process.cwd(), "app/globals.css");
    const css = fs.readFileSync(cssPath, "utf-8");

    it("includes a global @media (prefers-reduced-motion: reduce) block", () => {
      expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    });

    it("disables non-essential motion universally with fast durations and auto scroll", () => {
      expect(css).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
      expect(css).toMatch(/animation-iteration-count:\s*1\s*!important/);
      expect(css).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
      expect(css).toMatch(/scroll-behavior:\s*auto\s*!important/);
    });

    it("turns off xyflow edge animations under reduced motion", () => {
      expect(css).toContain(".react-flow__edge.animated path");
      expect(css).toMatch(/stroke-dasharray:\s*none\s*!important/);
    });

    it("disables looping decorative animations like preview-mug, steam, and decoration", () => {
      expect(css).toMatch(/\.preview-mug[\s\S]*?animation:\s*none\s*!important/);
      expect(css).toMatch(/\.steam[\s\S]*?animation:\s*none\s*!important/);
      expect(css).toMatch(/\.decoration[\s\S]*?animation:\s*none\s*!important/);
    });
  });

  describe("usePrefersReducedMotion hook", () => {
    it("is exported and alias is available", () => {
      expect(typeof usePrefersReducedMotion).toBe("function");
      expect(useReducedMotion).toBe(usePrefersReducedMotion);
    });
  });
});
