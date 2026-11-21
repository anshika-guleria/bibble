"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { getStoredMapsForScope, getUserScopedKey, migrateGuestMapsToAccount } from "@/lib/maps/sync";

const MapSessionContext = createContext<string | null | undefined>(undefined);

/** A validated server identity; the root remounts this workspace when accounts change. */
export function MapSessionProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!userId) {
      try { getStoredMapsForScope(null); }
      catch { queueMicrotask(() => { if (active) setMessage("Stored offline maps could not be read. Your original data has been preserved."); }); }
      return;
    }
    void migrateGuestMapsToAccount(userId).then((result) => {
      if (!active) return;
      if (result.failedIds.length) setMessage("Some offline maps could not sync. They are still saved on this device; refresh to retry.");
      else if (result.migratedCount) setMessage(`Synced ${result.migratedCount} offline map${result.migratedCount === 1 ? "" : "s"} to your account! 🍓`);
    }).catch(() => {
      if (active) setMessage("Your offline maps are still on this device. Refresh to retry syncing.");
    });
    return () => { active = false; };
  }, [userId]);
  return <MapSessionContext.Provider value={userId}>
    {message && <aside className="cozy-toast" role="status" aria-live="polite"><p>{message}</p><button onClick={() => setMessage(null)}>Dismiss</button></aside>}
    {children}
  </MapSessionContext.Provider>;
}

export function useMapSession() {
  const userId = useContext(MapSessionContext);
  if (userId === undefined) throw new Error("Map storage needs MapSessionProvider.");
  return userId;
}

export function useMapStorage<T>(baseKey: string, initial: T) {
  return useLocalStorage(getUserScopedKey(baseKey, useMapSession()), initial);
}
