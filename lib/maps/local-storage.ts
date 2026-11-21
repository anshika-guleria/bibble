import { z } from "zod";
import { learningMapImportSchema } from "./export-import";

const storedMapSchema = learningMapImportSchema.extend({
  id: z.string().min(1),
  description: z.string(),
  category: z.string(),
  accent: z.string(),
});

export function normalizeLocalMapData(key: string, value: unknown): unknown {
  if (key === "bibble-maps" || key.startsWith("bibble-maps:")) {
    // Keep valid siblings and their extra fields rather than replacing the whole collection.
    return Array.isArray(value)
      ? value.filter((map) => storedMapSchema.safeParse(map).success)
      : [];
  }
  if (key === "bibble-deleted-maps" || key.startsWith("bibble-deleted-maps:")) {
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : [];
  }
  return value;
}
