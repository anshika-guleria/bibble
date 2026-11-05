import { describe, expect, it } from "vitest";
import {
  isValidResourceUrl,
  sanitizeMapResources,
  sanitizeResources,
  validateResourceUrl,
} from "./resource-url";
import { flowToMap, mapToFlow } from "./map-utils";
import type { LearningMap, MapResource } from "@/types/map";

describe("resource URL validation", () => {
  describe("validateResourceUrl", () => {
    it("accepts valid https URLs and trims whitespace", () => {
      const result = validateResourceUrl("  https://react.dev/learn  ");
      expect(result.valid).toBe(true);
      expect(result.url).toBe("https://react.dev/learn");
      expect(result.error).toBeUndefined();
    });

    it("accepts valid http URLs", () => {
      const result = validateResourceUrl("http://localhost:3000/docs");
      expect(result.valid).toBe(true);
      expect(result.url).toBe("http://localhost:3000/docs");
    });

    it("rejects javascript: URLs with a clear message", () => {
      const result = validateResourceUrl("javascript:alert(document.domain)");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/javascript:.*not allowed/i);
    });

    it("rejects case-insensitive JAVASCRIPT: URLs", () => {
      const result = validateResourceUrl("JAVASCRIPT:alert(1)");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/javascript:.*not allowed/i);
    });

    it("rejects data: URLs with a clear message", () => {
      const result = validateResourceUrl("data:text/html,<script>alert(1)</script>");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/data:.*not allowed/i);
    });

    it("rejects other non-http/https protocols", () => {
      expect(validateResourceUrl("ftp://example.com").valid).toBe(false);
      expect(validateResourceUrl("file:///etc/passwd").valid).toBe(false);
      expect(validateResourceUrl("vbscript:msgbox").valid).toBe(false);
    });

    it("rejects empty or whitespace-only strings", () => {
      expect(validateResourceUrl("").valid).toBe(false);
      expect(validateResourceUrl("   ").valid).toBe(false);
      expect(validateResourceUrl(null).valid).toBe(false);
      expect(validateResourceUrl(undefined).valid).toBe(false);
    });

    it("rejects malformed or scheme-only URLs", () => {
      expect(validateResourceUrl("https://").valid).toBe(false);
      expect(validateResourceUrl("http://").valid).toBe(false);
      expect(validateResourceUrl("not a url").valid).toBe(false);
    });
  });

  describe("isValidResourceUrl", () => {
    it("returns true only for valid http and https URLs", () => {
      expect(isValidResourceUrl("https://example.com")).toBe(true);
      expect(isValidResourceUrl("http://example.com")).toBe(true);
      expect(isValidResourceUrl("javascript:alert(1)")).toBe(false);
      expect(isValidResourceUrl("data:text/html,test")).toBe(false);
      expect(isValidResourceUrl("")).toBe(false);
    });
  });

  describe("sanitizeResources", () => {
    it("drops resources with invalid or malicious URLs and keeps valid ones", () => {
      const mixed: MapResource[] = [
        { id: "1", label: "Docs", url: "https://docs.com" },
        { id: "2", label: "Bad", url: "javascript:alert(1)" },
        { id: "3", label: "Data", url: "data:text/html,bad" },
        { id: "4", label: "Good", url: "http://good.org" },
      ];

      const clean = sanitizeResources(mixed);
      expect(clean).toEqual([
        { id: "1", label: "Docs", url: "https://docs.com" },
        { id: "4", label: "Good", url: "http://good.org" },
      ]);
    });

    it("handles null or undefined resources safely", () => {
      expect(sanitizeResources(null)).toEqual([]);
      expect(sanitizeResources(undefined)).toEqual([]);
    });
  });

  describe("sanitizeMapResources", () => {
    it("cleans resources across all bibbles in a map", () => {
      const dirtyMap: LearningMap = {
        id: "test-map",
        title: "Test Map",
        description: "Test description",
        category: "Tech",
        accent: "blue",
        edges: [],
        bibbles: [
          {
            id: "b1",
            title: "Node 1",
            status: "learning",
            progress: 50,
            position: { x: 0, y: 0 },
            resources: [
              { id: "r1", label: "Valid", url: "https://valid.com" },
              { id: "r2", label: "Attack", url: "javascript:alert(1)" },
            ],
          },
          {
            id: "b2",
            title: "Node 2",
            status: "not-started",
            progress: 0,
            position: { x: 100, y: 100 },
            resources: [
              { id: "r3", label: "Malicious Data", url: "data:text/html,<script>bad()</script>" },
            ],
          },
        ],
      };

      const cleanMap = sanitizeMapResources(dirtyMap);
      expect(cleanMap.bibbles[0].resources).toEqual([
        { id: "r1", label: "Valid", url: "https://valid.com" },
      ]);
      expect(cleanMap.bibbles[1].resources).toEqual([]);
    });
  });

  describe("mapToFlow and flowToMap sanitization", () => {
    it("ignores invalid resource links when mapping to flow nodes", () => {
      const map: LearningMap = {
        id: "test",
        title: "Test",
        description: "",
        category: "",
        accent: "blue",
        edges: [],
        bibbles: [
          {
            id: "b1",
            title: "B1",
            status: "learning",
            progress: 20,
            position: { x: 0, y: 0 },
            resources: [
              { id: "r1", label: "Valid", url: "https://example.com" },
              { id: "r2", label: "XSS", url: "javascript:alert(1)" },
            ],
          },
        ],
      };

      const flow = mapToFlow(map);
      expect(flow.nodes[0].data.resources).toEqual([
        { id: "r1", label: "Valid", url: "https://example.com" },
      ]);

      const roundtrip = flowToMap(map, flow.nodes, flow.edges);
      expect(roundtrip.bibbles[0].resources).toEqual([
        { id: "r1", label: "Valid", url: "https://example.com" },
      ]);
    });
  });
});

