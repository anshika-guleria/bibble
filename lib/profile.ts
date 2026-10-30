import { categories } from "@/data/categories";

export interface Profile {
  displayName: string;
  role: string;
  bio: string;
  interests: string[];
  avatarUrl: string;
  githubUrl: string;
  linkedinUrl: string;
  websiteUrl: string;
  email: string;
}

export const PROFILE_LIMITS = {
  displayName: 40,
  role: 60,
  bio: 160,
  interest: 30,
  interests: 8,
  url: 200,
  email: 120,
} as const;

export const INTEREST_SUGGESTIONS = categories.filter((category) => category !== "All maps");

export const emptyProfile: Profile = {
  displayName: "",
  role: "",
  bio: "",
  interests: [],
  avatarUrl: "",
  githubUrl: "",
  linkedinUrl: "",
  websiteUrl: "",
  email: "",
};

export interface ProfileFieldErrors {
  displayName?: string;
  role?: string;
  bio?: string;
  avatarUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  email?: string;
}

export interface UrlValidation {
  value: string;
  error?: string;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function cleanLine(value: unknown, maxLength: number): string {
  return asString(value).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanBio(value: unknown, maxLength: number): string {
  const text = asString(value)
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();
  return text.slice(0, maxLength);
}

export function normalizeUrl(raw: string): UrlValidation {
  const trimmed = raw.trim();
  if (!trimmed) return { value: "" };

  if (trimmed.length > PROFILE_LIMITS.url) {
    return { value: "", error: `Keep links under ${PROFILE_LIMITS.url} characters.` };
  }

  const scheme = /^([a-z][a-z0-9+-]*):/i.exec(trimmed)?.[1]?.toLowerCase();
  if (scheme && scheme !== "http" && scheme !== "https") {
    return { value: "", error: "Links need to start with http:// or https://." };
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { value: "", error: "Enter a valid link, like https://example.com." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { value: "", error: "Links need to start with http:// or https://." };
  }

  if (!parsed.hostname.includes(".")) {
    return { value: "", error: "Enter a full link, like https://example.com." };
  }

  return { value: parsed.toString() };
}

function storedUrl(value: unknown): string {
  const result = normalizeUrl(asString(value));
  return result.error ? "" : result.value;
}

export function normalizeEmail(raw: string): UrlValidation {
  const trimmed = raw.trim();
  if (!trimmed) return { value: "" };

  if (trimmed.length > PROFILE_LIMITS.email) {
    return { value: "", error: `Keep emails under ${PROFILE_LIMITS.email} characters.` };
  }

  const valid =
    /^[^\s@:]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed) &&
    !trimmed.startsWith(".") &&
    !trimmed.includes("..");

  if (!valid) {
    return { value: "", error: "Enter a valid email, like you@example.com." };
  }

  return { value: trimmed };
}

function storedEmail(value: unknown): string {
  const result = normalizeEmail(asString(value));
  return result.error ? "" : result.value;
}

export function normalizeInterests(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const interests: string[] = [];

  for (const entry of value) {
    const interest = cleanLine(entry, PROFILE_LIMITS.interest);
    if (!interest) continue;

    const key = interest.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    interests.push(interest);
    if (interests.length >= PROFILE_LIMITS.interests) break;
  }

  return interests;
}

/**
 * Converts any stored profile shape, including the original
 * `{ displayName, bio, interests }` object, into the current model.
 */
export function normalizeProfile(value: unknown): Profile {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...emptyProfile, interests: [] };
  }

  const record = value as Record<string, unknown>;

  return {
    displayName: cleanLine(record.displayName, PROFILE_LIMITS.displayName),
    role: cleanLine(record.role, PROFILE_LIMITS.role),
    bio: cleanBio(record.bio, PROFILE_LIMITS.bio),
    interests: normalizeInterests(record.interests),
    avatarUrl: storedUrl(record.avatarUrl),
    githubUrl: storedUrl(record.githubUrl),
    linkedinUrl: storedUrl(record.linkedinUrl),
    websiteUrl: storedUrl(record.websiteUrl),
    email: storedEmail(record.email),
  };
}

export function profileHasDetails(profile: Profile): boolean {
  return Boolean(
    profile.displayName ||
      profile.role ||
      profile.bio ||
      profile.interests.length ||
      profile.githubUrl ||
      profile.linkedinUrl ||
      profile.websiteUrl ||
      profile.email
  );
}

export function profileInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "B";

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

export interface ProfileValidationResult {
  value: Profile;
  errors: ProfileFieldErrors;
}

export function validateProfileDraft(draft: Profile): ProfileValidationResult {
  const errors: ProfileFieldErrors = {};
  const displayName = cleanLine(draft.displayName, PROFILE_LIMITS.displayName);
  const role = cleanLine(draft.role, PROFILE_LIMITS.role);
  const bio = cleanBio(draft.bio, PROFILE_LIMITS.bio);
  const avatar = normalizeUrl(draft.avatarUrl);
  const github = normalizeUrl(draft.githubUrl);
  const linkedin = normalizeUrl(draft.linkedinUrl);
  const website = normalizeUrl(draft.websiteUrl);
  const email = normalizeEmail(draft.email);

  if (!displayName) {
    errors.displayName = "Add a display name so the profile feels like you.";
  }

  if (avatar.error) errors.avatarUrl = avatar.error;
  if (github.error) errors.githubUrl = github.error;
  if (linkedin.error) errors.linkedinUrl = linkedin.error;
  if (website.error) errors.websiteUrl = website.error;
  if (email.error) errors.email = email.error;

  return {
    value: {
      displayName,
      role,
      bio,
      interests: normalizeInterests(draft.interests),
      avatarUrl: avatar.error ? "" : avatar.value,
      githubUrl: github.error ? "" : github.value,
      linkedinUrl: linkedin.error ? "" : linkedin.value,
      websiteUrl: website.error ? "" : website.value,
      email: email.error ? "" : email.value,
    },
    errors,
  };
}
