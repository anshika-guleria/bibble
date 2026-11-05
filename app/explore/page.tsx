"use client";

import { MapCard } from "@/components/explore/map-card";
import { SiteHeader } from "@/components/site-header";
import { categories } from "@/data/categories";
import { sampleMaps } from "@/data/sample-maps";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { LearningMap } from "@/types/map";
import { deleteMapFromSupabase, listMapsFromSupabase } from "@/lib/maps/persistence";
import { Search, SlidersHorizontal, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All maps");
  // Read user-saved/custom maps and the IDs of system maps the user removed.
  const [storedMaps, setStoredMaps] = useLocalStorage<LearningMap[]>("bibble-maps", []);
  const [deletedMapIds, setDeletedMapIds] = useLocalStorage<string[]>("bibble-deleted-maps", []);
  const [remoteMaps, setRemoteMaps] = useState<LearningMap[]>([]);
  useEffect(() => {
    listMapsFromSupabase().then(setRemoteMaps).catch(() => setRemoteMaps([]));
  }, []);

  // Merge: stored maps override matching sample maps, user-created maps are appended,
  // and system maps the user deleted are left out entirely (even if an override exists).
  const allMaps = useMemo(() => {
    const merged = sampleMaps
      .filter((sample) => !deletedMapIds.includes(sample.id))
      .map((sample) => {
        const saved = storedMaps.find((m) => m.id === sample.id);
        return saved ?? sample;
      });
    for (const stored of storedMaps) {
      if (deletedMapIds.includes(stored.id)) continue;
      if (!merged.some((m) => m.id === stored.id)) {
        merged.push(stored);
      }
    }
    for (const remote of remoteMaps) {
      if (deletedMapIds.includes(remote.id)) continue;
      const existingIndex = merged.findIndex((map) => map.id === remote.id);
      if (existingIndex >= 0) merged[existingIndex] = remote;
      else merged.push(remote);
    }
    return merged;
  }, [storedMaps, deletedMapIds, remoteMaps]);

  const maps = useMemo(
    () => allMaps.filter(
      (map) =>
        (category === "All maps" || map.category === category) &&
        `${map.title} ${map.description}`.toLowerCase().includes(query.toLowerCase()),
    ),
    [allMaps, category, query],
  );

  // System maps are hidden via an ID list; user-created maps are removed from storage.
  const handleDeleteMap = async (mapId: string) => {
    if (sampleMaps.some((map) => map.id === mapId)) {
      setDeletedMapIds((currentIds) =>
        currentIds.includes(mapId) ? currentIds : [...currentIds, mapId],
      );
      return;
    }
    if (await deleteMapFromSupabase(mapId)) {
      setStoredMaps((currentMaps) => currentMaps.filter((map) => map.id !== mapId));
      setRemoteMaps((currentMaps) => currentMaps.filter((map) => map.id !== mapId));
    }
  };

  return (
    <div className="app-page">
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="page-intro">
          <div>
            <span className="eyebrow"><Star size={14} /> Small worlds of knowledge</span>
            <h1>Find a map that feels like yours.</h1>
            <p>Browse a few learning worlds made for wandering, connecting, and coming back to.</p>
          </div>
          <div className="explore-stats"><strong>{allMaps.length}</strong><span>maps<br />to explore</span></div>
        </section>
        <section className="explore-controls">
          <label className="search-field">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search maps" aria-label="Search maps" />
          </label>
          <div className="category-row" role="group" aria-label="Filter by category">
            <SlidersHorizontal size={16} />
            {categories.map((item) => (
              <button key={item} className={category === item ? "category-active" : ""} onClick={() => setCategory(item)}>{item}</button>
            ))}
          </div>
        </section>
        <section className="map-grid">
          {maps.map((map) => (
            <MapCard
              key={map.id}
              map={map}
              onDelete={handleDeleteMap}
            />
          ))}
        </section>
        {maps.length === 0 && (
          <div className="empty-state">
            <Star size={22} /><h2>No bibbles here yet.</h2><p>Try a different search or category.</p>
          </div>
        )}
      </main>
    </div>
  );
}
