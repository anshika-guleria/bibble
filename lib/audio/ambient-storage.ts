import type { Soundscape } from "./sound-synth";

export const STORAGE_KEY_SOUNDSCAPE = "bibble-ambient-soundscape";
export const STORAGE_KEY_SOUND_ALT = "bibble-ambient-sound";
export const STORAGE_KEY_VOLUME = "bibble-ambient-volume";
export const STORAGE_KEY_MUTED = "bibble-ambient-muted";
export const STORAGE_KEY_MUTED_ALT = "bibble-ambient-mute";

export const DEFAULT_SOUNDSCAPE: Soundscape = "rain";
export const DEFAULT_VOLUME = 0.6;
export const DEFAULT_MUTED = false;

export const VALID_SOUNDSCAPES: readonly Soundscape[] = [
  "off",
  "rain",
  "wind",
  "drift",
  "cafe",
  "minecraft",
  "nature",
] as const;

export function isValidSoundscape(val: unknown): val is Soundscape {
  return typeof val === "string" && (VALID_SOUNDSCAPES as readonly string[]).includes(val);
}

export function normalizeSoundscape(
  val: unknown,
  fallback: Soundscape = DEFAULT_SOUNDSCAPE
): Soundscape {
  return isValidSoundscape(val) ? val : fallback;
}

export function normalizeVolume(
  val: unknown,
  fallback: number = DEFAULT_VOLUME
): number {
  if (typeof val !== "number" || Number.isNaN(val) || !Number.isFinite(val)) {
    return fallback;
  }
  if (val < 0 || val > 1) {
    return fallback;
  }
  return Math.round(val * 100) / 100;
}

export function normalizeMuted(
  val: unknown,
  fallback: boolean = DEFAULT_MUTED
): boolean {
  if (typeof val !== "boolean") {
    return fallback;
  }
  return val;
}

