"use client";

import { LearningMapCanvas } from "@/components/map/learning-map";
import { MapHeader } from "@/components/map/map-header";
import { getMapById } from "@/data/sample-maps";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { LearningMap } from "@/types/map";
import { loadMapFromSupabase } from "@/lib/maps/persistence";
import { sanitizeMapResources } from "@/lib/resource-url";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditMapPage() {
  const { id } = useParams<{ id: string }>();
  const [storedMaps, , storedHydrated] = useLocalStorage<LearningMap[]>("bibble-maps", []);
  const [deletedMapIds, , deletedHydrated] = useLocalStorage<string[]>("bibble-deleted-maps", []);
  const [remoteResult, setRemoteResult] = useState<{ id: string; map: LearningMap | null } | null>(null);
  const hydrated = storedHydrated && deletedHydrated;
  const sampleMap = getMapById(id);
  const localMap = deletedMapIds.includes(id)
    ? undefined
    : storedMaps.find((storedMap) => storedMap.id === id) ?? sampleMap;
  useEffect(() => {
    if (!hydrated || sampleMap) return;
    let cancelled = false;
    loadMapFromSupabase(id).then((remoteMap) => {
      if (!cancelled) setRemoteResult({ id, map: remoteMap });
    }).catch(() => {
      if (!cancelled) setRemoteResult({ id, map: null });
    });
    return () => { cancelled = true; };
  }, [hydrated, id, sampleMap]);
  const remoteMap = remoteResult?.id === id ? remoteResult.map : undefined;
  const remoteLoaded = remoteResult?.id === id;
  const rawMap = remoteLoaded && remoteMap ? remoteMap : localMap;
  const map = rawMap ? sanitizeMapResources(rawMap) : null;
  const remoteLoading = hydrated && !localMap && remoteResult?.id !== id;

  if (!hydrated || (remoteLoading && !map)) {
    return (
      <main className="empty-state">
        <h2>Loading map…</h2>
      </main>
    );
  }

  if (!map) {
    return (
      <main className="empty-state">
        <h2>This map wandered off.</h2>
        <Link href="/explore" className="text-link">
          Back to explore <ArrowLeft size={15} />
        </Link>
      </main>
    );
  }

  return (
    <main className="map-page">
      <MapHeader
        title={map.title}
        category={map.category}
        mapId={map.id}
        isEditing
      />
      <LearningMapCanvas key={map.id} initialMap={map} editable preferInitialMap={Boolean(remoteMap)} />
    </main>
  );
}
