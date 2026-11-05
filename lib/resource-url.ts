import type { LearningMap, MapResource } from "@/types/map";

export interface ResourceUrlValidation {
  valid: boolean;
  url?: string;
  error?: string;
}

/**
 * Generates a unique ID for a newly added resource.
 */
export function createResourceId(): string {
  return `resource-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Validates that a resource URL is a valid http: or https: URL.
 * - Trims whitespace.
 * - Explicitly rejects javascript: and data: URLs with friendly messages.
 * - Rejects any scheme other than http: and https:.
 * - Accepts valid http and https URLs.
 */
export function validateResourceUrl(raw: unknown): ResourceUrlValidation {
  if (typeof raw !== "string") {
    return { valid: false, error: "Please enter a URL." };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, error: "Please enter a URL." };
  }

  // Check scheme
  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(trimmed);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (scheme === "javascript") {
      return {
        valid: false,
        error: "javascript: links are not allowed. Only http:// and https:// links are accepted.",
      };
    }
    if (scheme === "data") {
      return {
        valid: false,
        error: "data: links are not allowed. Only http:// and https:// links are accepted.",
      };
    }
    if (scheme === "vbscript" || scheme === "file") {
      return {
        valid: false,
        error: `${scheme}: links are not allowed. Only http:// and https:// links are accepted.`,
      };
    }
    if (scheme !== "http" && scheme !== "https") {
      return {
        valid: false,
        error: "Only http:// and https:// links are allowed.",
      };
    }
  } else {
    return {
      valid: false,
      error: "Links must start with http:// or https://.",
    };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { valid: false, error: "Only http:// and https:// links are allowed." };
    }
    if (!parsed.hostname) {
      return { valid: false, error: "Please enter a valid http or https URL." };
    }
    return { valid: true, url: trimmed };
  } catch {
    return { valid: false, error: "Please enter a valid http or https URL." };
  }
}

/**
 * Returns true if the provided value is a valid http or https URL.
 */
export function isValidResourceUrl(raw: unknown): boolean {
  return validateResourceUrl(raw).valid;
}

/**
 * Filters out invalid resources (keeps only those with valid http/https URLs).
 */
export function sanitizeResources(resources?: MapResource[] | null): MapResource[] {
  if (!Array.isArray(resources)) return [];
  return resources.filter((resource) => resource && typeof resource.url === "string" && isValidResourceUrl(resource.url));
}

/**
 * Cleans all bibbles in a LearningMap so invalid stored resources are omitted.
 */
export function sanitizeMapResources(map: LearningMap): LearningMap {
  if (!map || !Array.isArray(map.bibbles)) return map;
  return {
    ...map,
    bibbles: map.bibbles.map((bibble) => ({
      ...bibble,
      resources: sanitizeResources(bibble.resources),
    })),
  };
}

