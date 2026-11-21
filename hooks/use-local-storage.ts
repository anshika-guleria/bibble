"use client";

import { useCallback, useMemo, useState, useSyncExternalStore, type SetStateAction } from "react";

import { normalizeLocalMapData } from "@/lib/maps/local-storage";

export const STORAGE_CHANGE_EVENT = "bibble-storage-change";
const noopSubscribe = () => () => {};

/** Read the current key directly so a scope change cannot reuse another user's state. */
export function useLocalStorage<T>(key: string | null, initialValue: T) {
  const [initial] = useState(() => initialValue);
  const subscribe = useCallback((notify: () => void) => {
    window.addEventListener("storage", notify);
    window.addEventListener(STORAGE_CHANGE_EVENT, notify);
    return () => {
      window.removeEventListener("storage", notify);
      window.removeEventListener(STORAGE_CHANGE_EVENT, notify);
    };
  }, []);
  const read = useCallback(() => {
    try { return key ? window.localStorage.getItem(key) : null; }
    catch { return null; }
  }, [key]);
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const value = useMemo(() => {
    try { return raw === null ? initial : normalizeLocalMapData(key ?? "", JSON.parse(raw)) as T; }
    catch { return initial; }
  }, [raw, initial, key]);
  const setValue = useCallback((update: SetStateAction<T>) => {
    if (!key) throw new Error("Map storage is not ready.");
    let current = initial;
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) current = normalizeLocalMapData(key, JSON.parse(stored)) as T;
    } catch { /* Replace malformed data only on an explicit write. */ }
    const next = update instanceof Function ? update(current) : update;
    window.localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new Event(STORAGE_CHANGE_EVENT));
  }, [key, initial]);
  return [value, setValue, hydrated && key !== null] as const;
}
