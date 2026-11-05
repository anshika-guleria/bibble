import { describe, expect, it } from "vitest";
import {
  DEFAULT_MUTED,
  DEFAULT_SOUNDSCAPE,
  DEFAULT_VOLUME,
  STORAGE_KEY_MUTED,
  STORAGE_KEY_MUTED_ALT,
  STORAGE_KEY_SOUND_ALT,
  STORAGE_KEY_SOUNDSCAPE,
  STORAGE_KEY_VOLUME,
  VALID_SOUNDSCAPES,
  isValidSoundscape,
  normalizeMuted,
  normalizeSoundscape,
  normalizeVolume,
} from "./ambient-storage";

describe("ambient-storage", () => {
  describe("storage keys and constants", () => {
    it("defines predictable storage keys", () => {
      expect(STORAGE_KEY_SOUNDSCAPE).toBe("bibble-ambient-soundscape");
      expect(STORAGE_KEY_SOUND_ALT).toBe("bibble-ambient-sound");
      expect(STORAGE_KEY_VOLUME).toBe("bibble-ambient-volume");
      expect(STORAGE_KEY_MUTED).toBe("bibble-ambient-muted");
      expect(STORAGE_KEY_MUTED_ALT).toBe("bibble-ambient-mute");
    });

    it("has sensible default values", () => {
      expect(DEFAULT_SOUNDSCAPE).toBe("rain");
      expect(DEFAULT_VOLUME).toBe(0.6);
      expect(DEFAULT_MUTED).toBe(false);
    });

    it("includes all supported soundscape types", () => {
      expect(VALID_SOUNDSCAPES).toContain("rain");
      expect(VALID_SOUNDSCAPES).toContain("wind");
      expect(VALID_SOUNDSCAPES).toContain("drift");
      expect(VALID_SOUNDSCAPES).toContain("cafe");
      expect(VALID_SOUNDSCAPES).toContain("minecraft");
      expect(VALID_SOUNDSCAPES).toContain("nature");
      expect(VALID_SOUNDSCAPES).toContain("off");
    });
  });

  describe("soundscape validation and normalization", () => {
    it("accepts valid soundscape values", () => {
      for (const sound of VALID_SOUNDSCAPES) {
        expect(isValidSoundscape(sound)).toBe(true);
        expect(normalizeSoundscape(sound)).toBe(sound);
      }
    });

    it("rejects unknown or invalid soundscape values and falls back to default", () => {
      expect(isValidSoundscape("jazz")).toBe(false);
      expect(normalizeSoundscape("jazz")).toBe("rain");

      expect(isValidSoundscape("")).toBe(false);
      expect(normalizeSoundscape("")).toBe("rain");

      expect(isValidSoundscape(null)).toBe(false);
      expect(normalizeSoundscape(null)).toBe("rain");

      expect(isValidSoundscape(undefined)).toBe(false);
      expect(normalizeSoundscape(undefined)).toBe("rain");

      expect(isValidSoundscape(123)).toBe(false);
      expect(normalizeSoundscape(123)).toBe("rain");

      expect(isValidSoundscape({})).toBe(false);
      expect(normalizeSoundscape({})).toBe("rain");
    });

    it("uses custom fallback if provided", () => {
      expect(normalizeSoundscape("invalid", "cafe")).toBe("cafe");
    });
  });

  describe("volume normalization", () => {
    it("preserves valid volume values between 0 and 1", () => {
      expect(normalizeVolume(0)).toBe(0);
      expect(normalizeVolume(0.5)).toBe(0.5);
      expect(normalizeVolume(0.85)).toBe(0.85);
      expect(normalizeVolume(1)).toBe(1);
    });

    it("falls back to default volume on out-of-range numbers", () => {
      expect(normalizeVolume(-0.01)).toBe(DEFAULT_VOLUME);
      expect(normalizeVolume(-1)).toBe(DEFAULT_VOLUME);
      expect(normalizeVolume(1.01)).toBe(DEFAULT_VOLUME);
      expect(normalizeVolume(100)).toBe(DEFAULT_VOLUME);
    });

    it("falls back to default volume on non-numbers or non-finite numbers", () => {
      expect(normalizeVolume(NaN)).toBe(DEFAULT_VOLUME);
      expect(normalizeVolume(Infinity)).toBe(DEFAULT_VOLUME);
      expect(normalizeVolume(-Infinity)).toBe(DEFAULT_VOLUME);
      expect(normalizeVolume("0.5")).toBe(DEFAULT_VOLUME);
      expect(normalizeVolume(null)).toBe(DEFAULT_VOLUME);
      expect(normalizeVolume(undefined)).toBe(DEFAULT_VOLUME);
      expect(normalizeVolume({})).toBe(DEFAULT_VOLUME);
    });

    it("uses custom fallback volume if provided", () => {
      expect(normalizeVolume(-5, 0.4)).toBe(0.4);
      expect(normalizeVolume(NaN, 0.75)).toBe(0.75);
    });
  });

  describe("mute state normalization", () => {
    it("preserves valid boolean values", () => {
      expect(normalizeMuted(true)).toBe(true);
      expect(normalizeMuted(false)).toBe(false);
    });

    it("falls back to default muted state on non-boolean values", () => {
      expect(normalizeMuted("true")).toBe(DEFAULT_MUTED);
      expect(normalizeMuted(1)).toBe(DEFAULT_MUTED);
      expect(normalizeMuted(0)).toBe(DEFAULT_MUTED);
      expect(normalizeMuted(null)).toBe(DEFAULT_MUTED);
      expect(normalizeMuted(undefined)).toBe(DEFAULT_MUTED);
      expect(normalizeMuted({})).toBe(DEFAULT_MUTED);
    });

    it("uses custom fallback if provided", () => {
      expect(normalizeMuted("invalid", true)).toBe(true);
    });
  });
});

