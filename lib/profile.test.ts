import { describe, expect, it } from "vitest";

import {
  emptyProfile,
  normalizeEmail,
  normalizeProfile,
  normalizeUrl,
  profileHasDetails,
  profileInitials,
  validateProfileDraft,
} from "./profile";

describe("profile model", () => {
  it("migrates the original profile shape with defaults for new fields", () => {
    const profile = normalizeProfile({
      displayName: "  Ada Lovelace ",
      bio: "Learning recursion.",
      interests: ["Frontend", "frontend", "  "],
    });

    expect(profile).toEqual({
      displayName: "Ada Lovelace",
      role: "",
      bio: "Learning recursion.",
      interests: ["Frontend"],
      avatarUrl: "",
      githubUrl: "",
      linkedinUrl: "",
      websiteUrl: "",
      email: "",
    });
    expect(profileHasDetails(profile)).toBe(true);
  });

  it("falls back to an empty profile for unusable stored data", () => {
    expect(normalizeProfile(null)).toEqual({ ...emptyProfile, interests: [] });
    expect(normalizeProfile(["unexpected"])).toEqual({ ...emptyProfile, interests: [] });
  });

  it("drops invalid stored links instead of rendering them", () => {
    const profile = normalizeProfile({
      displayName: "Ada",
      githubUrl: "javascript:alert(1)",
      websiteUrl: "example.com/me",
      linkedinUrl: "linkedin.com/in/ada",
    });

    expect(profile.githubUrl).toBe("");
    expect(profile.websiteUrl).toBe("https://example.com/me");
    expect(profile.linkedinUrl).toBe("https://linkedin.com/in/ada");
  });

  it("keeps a valid stored email and drops a malformed one", () => {
    expect(normalizeProfile({ displayName: "Ada", email: "ada@example.com" }).email).toBe(
      "ada@example.com"
    );
    expect(normalizeProfile({ displayName: "Ada", email: "not-an-email" }).email).toBe("");
  });

  it("builds initials from the display name", () => {
    expect(profileInitials("Ada Lovelace")).toBe("AL");
    expect(profileInitials("  Grace  Brewster Hopper ")).toBe("GB");
    expect(profileInitials("")).toBe("B");
  });
});

describe("profile URL validation", () => {
  it("accepts bare domains and normalizes them to https", () => {
    expect(normalizeUrl("github.com/ada").value).toBe("https://github.com/ada");
  });

  it("rejects unsafe protocols and malformed hosts", () => {
    expect(normalizeUrl("javascript:alert(1)").error).toBeTruthy();
    expect(normalizeUrl("not a url").error).toBeTruthy();
  });

  it("keeps empty links empty", () => {
    expect(normalizeUrl("   ")).toEqual({ value: "" });
  });
});

describe("profile email validation", () => {
  it("trims a valid email", () => {
    expect(normalizeEmail("  ada@example.com ")).toEqual({ value: "ada@example.com" });
  });

  it("rejects malformed and unsafe emails", () => {
    expect(normalizeEmail("ada").error).toBeTruthy();
    expect(normalizeEmail("ada@example").error).toBeTruthy();
    expect(normalizeEmail("ada@exa mple.com").error).toBeTruthy();
    expect(normalizeEmail("mailto:ada@example.com").error).toBeTruthy();
    expect(normalizeEmail("ada@example..com").error).toBeTruthy();
  });

  it("keeps an empty email empty", () => {
    expect(normalizeEmail("   ")).toEqual({ value: "" });
  });
});

describe("profile draft validation", () => {
  it("requires a display name", () => {
    const result = validateProfileDraft({ ...emptyProfile, role: "Learner" });
    expect(result.errors.displayName).toBeTruthy();
  });

  it("normalizes interests and links before saving", () => {
    const result = validateProfileDraft({
      ...emptyProfile,
      displayName: " Ada ",
      interests: ["Frontend", " Frontend ", "Tools"],
      githubUrl: "github.com/ada",
      linkedinUrl: "linkedin.com/in/ada",
      email: " ada@example.com ",
    });

    expect(result.errors).toEqual({});
    expect(result.value.displayName).toBe("Ada");
    expect(result.value.interests).toEqual(["Frontend", "Tools"]);
    expect(result.value.githubUrl).toBe("https://github.com/ada");
    expect(result.value.linkedinUrl).toBe("https://linkedin.com/in/ada");
    expect(result.value.email).toBe("ada@example.com");
  });

  it("reports LinkedIn and email errors instead of storing invalid values", () => {
    const result = validateProfileDraft({
      ...emptyProfile,
      displayName: "Ada",
      linkedinUrl: "javascript:alert(1)",
      email: "not-an-email",
    });

    expect(result.errors.linkedinUrl).toBeTruthy();
    expect(result.errors.email).toBeTruthy();
    expect(result.value.linkedinUrl).toBe("");
    expect(result.value.email).toBe("");
  });
});
