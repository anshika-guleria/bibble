"use client";

import { LearningMapCanvas } from "@/components/map/learning-map";
import { sampleMaps } from "@/data/sample-maps";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { LearningMap } from "@/types/map";
import { loadMapFromSupabase } from "@/lib/maps/persistence";
import { sanitizeMapResources } from "@/lib/resource-url";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function MapPageClient() {
  const { id } = useParams<{ id: string }>();
  const [storedMaps, , storedHydrated] = useLocalStorage<LearningMap[]>("bibble-maps", []);
  const [deletedMapIds, , deletedHydrated] = useLocalStorage<string[]>("bibble-deleted-maps", []);
  const hydrated = storedHydrated && deletedHydrated;
  const [remoteResult, setRemoteResult] = useState<{ id: string; map: LearningMap | null } | null>(null);

  const map = useMemo(() => {
    if (deletedMapIds.includes(id)) return null;
    return storedMaps.find((storedMap) => storedMap.id === id)
      ?? sampleMaps.find((sampleMap) => sampleMap.id === id)
      ?? null;
  }, [storedMaps, deletedMapIds, id]);
  const isSampleMap = sampleMaps.some((sampleMap) => sampleMap.id === id);
  useEffect(() => {
    if (!hydrated || isSampleMap) return;
    let cancelled = false;
    loadMapFromSupabase(id).then((remoteMap) => {
      if (!cancelled) setRemoteResult({ id, map: remoteMap });
    }).catch(() => {
      if (!cancelled) setRemoteResult({ id, map: null });
    });
    return () => { cancelled = true; };
  }, [hydrated, id, isSampleMap]);
  const remoteMap = remoteResult?.id === id ? remoteResult.map : undefined;
  const remoteLoaded = remoteResult?.id === id;
  const rawMap = remoteLoaded && remoteMap ? remoteMap : map;
  const resolvedMap = rawMap ? sanitizeMapResources(rawMap) : null;
  const remoteLoading = hydrated && !map && remoteResult?.id !== id;

  if (!hydrated || (remoteLoading && !resolvedMap)) {
    return (
      <main className="empty-state">
        <h2>Loading map…</h2>
      </main>
    );
  }

  if (!resolvedMap) {
    return (
      <main className="empty-state">
        <h2>This map wandered off.</h2>
        <Link href="/explore" className="text-link">
          Back to explore <ArrowLeft size={15} />
        </Link>
      </main>
    );
  }

  return <LearningMapCanvas initialMap={resolvedMap} preferInitialMap={Boolean(remoteMap)} />;
}
