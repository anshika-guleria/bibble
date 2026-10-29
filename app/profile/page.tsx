"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useStudyStats } from "@/hooks/use-study-stats";
import {
  FEEDBACK_LIMITS,
  FEEDBACK_TYPE_OPTIONS,
  hasValidationErrors,
  parseFeedbackInput,
  type FeedbackFieldErrors,
  type FeedbackType,
} from "@/lib/feedback";
import {
  INTEREST_SUGGESTIONS,
  PROFILE_LIMITS,
  emptyProfile,
  normalizeProfile,
  normalizeUrl,
  profileHasDetails,
  profileInitials,
  validateProfileDraft,
  type Profile,
  type ProfileFieldErrors,
} from "@/lib/profile";
import {
  AlertCircle,
  ArrowUpRight,
  Briefcase,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  Globe,
  LoaderCircle,
  Mail,
  MessageSquare,
  Monitor,
  Pencil,
  Plus,
  Send,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./profile.module.css";

const PROFILE_STORAGE_KEY = "bibble-profile";

type TextField =
  | "displayName"
  | "role"
  | "bio"
  | "avatarUrl"
  | "githubUrl"
  | "linkedinUrl"
  | "websiteUrl"
  | "email";

const FIELD_ORDER: ReadonlyArray<keyof ProfileFieldErrors> = [
  "displayName",
  "role",
  "bio",
  "avatarUrl",
  "githubUrl",
  "linkedinUrl",
  "websiteUrl",
  "email",
];

function linkHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function GitHubMark({ size = 17 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.72.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}

function LinkedInMark({ size = 17 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function ProfileAvatar({
  displayName,
  avatarUrl,
  small = false,
}: {
  displayName: string;
  avatarUrl: string;
  small?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState("");

  const className = `${styles.avatar} ${small ? styles.avatarSmall : styles.avatarLarge}`;

  if (avatarUrl && failedUrl !== avatarUrl) {
    return (
      <span className={className}>
        {/* Remote avatar URLs are user-provided, so Next Image's fixed host allowlist would reject them. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt=""
          className={styles.avatarImage}
          onError={() => setFailedUrl(avatarUrl)}
          referrerPolicy="no-referrer"
        />
      </span>
    );
  }

  return (
    <span className={className} aria-hidden="true">
      <span className={styles.avatarInitials}>{profileInitials(displayName)}</span>
    </span>
  );
}

export default function ProfilePage() {
  const [storedProfile, setStoredProfile, profileHydrated] = useLocalStorage<unknown>(
    PROFILE_STORAGE_KEY,
    emptyProfile
  );
  const profile = useMemo(() => normalizeProfile(storedProfile), [storedProfile]);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Profile>(emptyProfile);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [interestInput, setInterestInput] = useState("");
  const [interestError, setInterestError] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);
  const [saving, setSaving] = useState(false);

  const normalizedOnce = useRef(false);
  const wasEditingRef = useRef(false);
  const savingRef = useRef(false);
  const focusInterestRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const interestInputRef = useRef<HTMLInputElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);

  const [feedbackType, setFeedbackType] = useState<FeedbackType>("feedback");
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackErrors, setFeedbackErrors] = useState<FeedbackFieldErrors>({});
  const [feedbackNotice, setFeedbackNotice] = useState<{ kind: "success" | "error"; text: string } | null>(
    null
  );
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const feedbackSubmittingRef = useRef(false);
  const feedbackTriggerRef = useRef<HTMLButtonElement>(null);
  const feedbackDialogRef = useRef<HTMLDivElement>(null);
  const feedbackCloseRef = useRef<HTMLButtonElement>(null);

  const {
    sessions,
    formattedDuration,
    streak,
    mapOverview,
    personalMapCount,
    hydrated: statsHydrated,
  } = useStudyStats();

  const avatarPreview = useMemo(() => {
    const result = normalizeUrl(draft.avatarUrl);
    return result.error ? "" : result.value;
  }, [draft.avatarUrl]);

  useEffect(() => {
    if (!profileHydrated || normalizedOnce.current) return;
    normalizedOnce.current = true;

    const normalized = normalizeProfile(storedProfile);
    if (JSON.stringify(normalized) !== JSON.stringify(storedProfile)) {
      setStoredProfile(normalized);
    }
  }, [profileHydrated, storedProfile, setStoredProfile]);

  useEffect(() => {
    if (editing) {
      if (focusInterestRef.current) {
        focusInterestRef.current = false;
        interestInputRef.current?.focus();
      } else {
        nameInputRef.current?.focus();
      }
    } else if (wasEditingRef.current) {
      (editButtonRef.current ?? createButtonRef.current)?.focus();
    }
    wasEditingRef.current = editing;
  }, [editing]);

  useEffect(() => {
    if (!savedNotice) return;
    const timer = window.setTimeout(() => setSavedNotice(false), 4000);
    return () => window.clearTimeout(timer);
  }, [savedNotice]);

  function startEditing(focusInterest = false) {
    focusInterestRef.current = focusInterest;
    setDraft({ ...profile, interests: [...profile.interests] });
    setFieldErrors({});
    setInterestInput("");
    setInterestError("");
    setSavedNotice(false);
    setEditing(true);
  }

  function cancelEditing() {
    if (savingRef.current) return;
    setDraft({ ...profile, interests: [...profile.interests] });
    setFieldErrors({});
    setInterestInput("");
    setInterestError("");
    setEditing(false);
  }

  function updateField(field: TextField, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function addInterest(raw: string) {
    const value = raw.trim().replace(/\s+/g, " ");

    if (!value) {
      setInterestError("Type a topic first.");
      return;
    }

    if (draft.interests.length >= PROFILE_LIMITS.interests) {
      setInterestError(`You can add up to ${PROFILE_LIMITS.interests} topics.`);
      return;
    }

    if (draft.interests.some((interest) => interest.toLowerCase() === value.toLowerCase())) {
      setInterestError("That topic is already in your list.");
      return;
    }

    setDraft((current) => ({ ...current, interests: [...current.interests, value] }));
    setInterestInput("");
    setInterestError("");
  }

  function removeInterest(value: string) {
    setDraft((current) => ({
      ...current,
      interests: current.interests.filter((interest) => interest !== value),
    }));
    setInterestError("");
  }

  function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;

    const result = validateProfileDraft(draft);
    setFieldErrors(result.errors);

    const firstInvalid = FIELD_ORDER.find((field) => result.errors[field]);
    if (firstInvalid) {
      document.getElementById(`profile-${firstInvalid}`)?.focus();
      return;
    }

    savingRef.current = true;
    setSaving(true);

    window.setTimeout(() => {
      setStoredProfile(result.value);
      setDraft(result.value);
      setInterestInput("");
      setInterestError("");
      setSaving(false);
      savingRef.current = false;
      setEditing(false);
      setSavedNotice(true);
    }, 320);
  }

  function clearFeedbackError(field: keyof FeedbackFieldErrors) {
    setFeedbackErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  const closeFeedback = useCallback(() => {
    if (feedbackSubmittingRef.current) return;
    setFeedbackOpen(false);
    setFeedbackNotice(null);
    setFeedbackErrors({});
    feedbackTriggerRef.current?.focus();
  }, []);

  function openFeedback() {
    setFeedbackOpen(true);
  }

  useEffect(() => {
    if (!feedbackOpen) return;

    const dialog = feedbackDialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    feedbackCloseRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeFeedback();
        return;
      }

      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [feedbackOpen, closeFeedback]);

  async function handleFeedbackSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (feedbackSubmittingRef.current) return;

    const parsed = parseFeedbackInput({
      type: feedbackType,
      subject: feedbackSubject,
      message: feedbackMessage,
    });
    setFeedbackErrors(parsed.errors);

    if (hasValidationErrors(parsed.errors)) {
      setFeedbackNotice(null);
      return;
    }

    feedbackSubmittingRef.current = true;
    setFeedbackSubmitting(true);
    setFeedbackNotice(null);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.value),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setFeedbackNotice({
          kind: "error",
          text: result?.error ?? "We couldn't send your feedback. Please try again.",
        });
        return;
      }

      setFeedbackType("feedback");
      setFeedbackSubject("");
      setFeedbackMessage("");
      setFeedbackErrors({});
      setFeedbackNotice({
        kind: "success",
        text: "Thanks! Your feedback has been sent successfully.",
      });
    } catch {
      setFeedbackNotice({
        kind: "error",
        text: "We couldn't reach the server. Check your connection and try again.",
      });
    } finally {
      feedbackSubmittingRef.current = false;
      setFeedbackSubmitting(false);
    }
  }

  const hasDetails = profileHasDetails(profile);

  return (
    <main className={styles.page}>
      <SiteHeader />
      <div className={styles.container}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>
            <UserRound size={14} aria-hidden="true" /> Your profile
          </p>
          <h1>
            About <em>you.</em>
          </h1>
          <p className={styles.sub}>A little space for who you are and what you&apos;re learning.</p>
          <p className={styles.localNotice}>
            <Monitor size={13} aria-hidden="true" /> Profile details stay in this browser until
            account sync arrives.
          </p>
        </header>

        {!profileHydrated && (
          <p className={styles.loading} role="status">
            Loading your profile…
          </p>
        )}

        {profileHydrated && !editing && !hasDetails && (
          <section className={styles.emptyCard} aria-labelledby="profile-empty-title">
            <div className={styles.emptyBadge} aria-hidden="true">
              <Sparkles size={28} />
            </div>
            <h2 id="profile-empty-title">This corner is still blank</h2>
            <p>
              Add a name, a role or course, and a few interests. It only takes a minute, and
              everything stays in this browser.
            </p>
            <button
              ref={createButtonRef}
              type="button"
              className={styles.primary}
              onClick={() => startEditing()}
            >
              <Pencil size={15} aria-hidden="true" /> Create your profile
            </button>
          </section>
        )}

        {profileHydrated && !editing && hasDetails && (
          <section className={styles.sheet} aria-labelledby="profile-name">
            <div className={styles.sheetTop}>
              <ProfileAvatar displayName={profile.displayName} avatarUrl={profile.avatarUrl} />
              <div className={styles.identity}>
                <p className={styles.sheetEyebrow}>Learner profile</p>
                <h2 id="profile-name">{profile.displayName || "Unnamed learner"}</h2>
                {profile.role && (
                  <p className={styles.role}>
                    <Briefcase size={14} aria-hidden="true" />
                    <span>{profile.role}</span>
                  </p>
                )}
              </div>
              <div className={styles.sheetActions}>
                <button
                  ref={editButtonRef}
                  type="button"
                  className={styles.secondary}
                  onClick={() => startEditing()}
                >
                  <Pencil size={14} aria-hidden="true" /> Edit profile
                </button>
              </div>
            </div>

            {savedNotice && (
              <p className={styles.savedNote} role="status">
                <Check size={14} aria-hidden="true" /> Profile updated successfully.
              </p>
            )}

            <p className={styles.bio}>
              {profile.bio || "No bio yet. A line about what you are learning would fit nicely here."}
            </p>

            <div className={styles.divider} />

            <div className={styles.block}>
              <div className={styles.blockHead}>
                <h3 className={styles.blockTitle}>
                  <Sparkles size={14} aria-hidden="true" /> Learning interests
                </h3>
                <span className={styles.blockMeta}>
                  {profile.interests.length} topic{profile.interests.length === 1 ? "" : "s"}
                </span>
              </div>
              {profile.interests.length > 0 ? (
                <ul className={styles.chips}>
                  {profile.interests.map((interest) => (
                    <li key={interest} className={styles.chip}>
                      {interest}
                    </li>
                  ))}
                  {profile.interests.length < PROFILE_LIMITS.interests && (
                    <li>
                      <button
                        type="button"
                        className={styles.chipAdd}
                        onClick={() => startEditing(true)}
                      >
                        <Plus size={12} aria-hidden="true" /> Add
                      </button>
                    </li>
                  )}
                </ul>
              ) : (
                <div className={styles.interestsEmpty}>
                  <p>Add a few things you&apos;re excited to learn.</p>
                  <button
                    type="button"
                    className={styles.chipAdd}
                    onClick={() => startEditing(true)}
                  >
                    <Plus size={12} aria-hidden="true" /> Add a topic
                  </button>
                </div>
              )}
            </div>

            {(profile.githubUrl ||
              profile.linkedinUrl ||
              profile.websiteUrl ||
              profile.email) && (
              <>
                <div className={styles.divider} />
                <div className={styles.block}>
                  <div className={styles.blockHead}>
                    <h3 className={styles.blockTitle}>
                      <Globe size={14} aria-hidden="true" /> Find me online
                    </h3>
                    <span className={styles.blockMeta}>Elsewhere on the web</span>
                  </div>
                  <div className={styles.links}>
                    {profile.githubUrl && (
                      <a
                        className={styles.linkCard}
                        href={profile.githubUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        <span className={`${styles.linkIcon} ${styles.linkIconGithub}`}>
                          <GitHubMark />
                        </span>
                        <span className={styles.linkText}>
                          <strong>GitHub</strong>
                          <small>{linkHost(profile.githubUrl)}</small>
                        </span>
                        <ArrowUpRight size={15} aria-hidden="true" className={styles.linkArrow} />
                        <span className={styles.srOnly}> (opens in a new tab)</span>
                      </a>
                    )}
                    {profile.linkedinUrl && (
                      <a
                        className={styles.linkCard}
                        href={profile.linkedinUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        <span className={`${styles.linkIcon} ${styles.linkIconLinkedin}`}>
                          <LinkedInMark />
                        </span>
                        <span className={styles.linkText}>
                          <strong>LinkedIn</strong>
                          <small>{linkHost(profile.linkedinUrl)}</small>
                        </span>
                        <ArrowUpRight size={15} aria-hidden="true" className={styles.linkArrow} />
                        <span className={styles.srOnly}> (opens in a new tab)</span>
                      </a>
                    )}
                    {profile.websiteUrl && (
                      <a
                        className={styles.linkCard}
                        href={profile.websiteUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        <span className={`${styles.linkIcon} ${styles.linkIconGlobe}`}>
                          <Globe size={17} aria-hidden="true" />
                        </span>
                        <span className={styles.linkText}>
                          <strong>Website</strong>
                          <small>{linkHost(profile.websiteUrl)}</small>
                        </span>
                        <ArrowUpRight size={15} aria-hidden="true" className={styles.linkArrow} />
                        <span className={styles.srOnly}> (opens in a new tab)</span>
                      </a>
                    )}
                    {profile.email && (
                      <a
                        className={`${styles.linkCard} ${styles.linkCardWide}`}
                        href={`mailto:${profile.email}`}
                      >
                        <span className={`${styles.linkIcon} ${styles.linkIconMail}`}>
                          <Mail size={17} aria-hidden="true" />
                        </span>
                        <span className={styles.linkText}>
                          <strong>Email</strong>
                          <small>{profile.email}</small>
                        </span>
                        <span className={styles.linkAction}>
                          Write <ArrowUpRight size={14} aria-hidden="true" />
                        </span>
                      </a>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {profileHydrated && editing && (
          <form
            className={styles.editor}
            onSubmit={handleProfileSubmit}
            noValidate
            aria-labelledby="profile-editor-title"
            aria-busy={saving}
          >
            <div className={styles.editorHead}>
              <p className={styles.eyebrow}>
                <Pencil size={14} aria-hidden="true" /> Editing profile
              </p>
              <h2 id="profile-editor-title">Make it feel like you.</h2>
              <p className={styles.hint}>Changes are saved in this browser only.</p>
            </div>

            <section className={styles.formSection} aria-labelledby="profile-basic-title">
              <div className={styles.formSectionHead}>
                <h3 id="profile-basic-title">Basic information</h3>
                <p>Who you are, and how you like to introduce yourself.</p>
              </div>

              <div className={styles.avatarEditor}>
              <ProfileAvatar displayName={draft.displayName} avatarUrl={avatarPreview} small />
              <div className={styles.avatarFields}>
                <label htmlFor="profile-avatarUrl" className={styles.label}>
                  Avatar image URL <span className={styles.optional}>(optional)</span>
                </label>
                <input
                  id="profile-avatarUrl"
                  type="text"
                  inputMode="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  className={styles.input}
                  value={draft.avatarUrl}
                  maxLength={PROFILE_LIMITS.url}
                  placeholder="https://example.com/avatar.png"
                  onChange={(event) => updateField("avatarUrl", event.target.value)}
                  aria-invalid={fieldErrors.avatarUrl ? true : undefined}
                  aria-describedby={
                    fieldErrors.avatarUrl ? "profile-avatarUrl-error" : "profile-avatarUrl-hint"
                  }
                />
                {fieldErrors.avatarUrl ? (
                  <p className={styles.error} id="profile-avatarUrl-error" role="alert">
                    {fieldErrors.avatarUrl}
                  </p>
                ) : (
                  <p className={styles.hint} id="profile-avatarUrl-hint">
                    Leave this empty to use your initials. A small square image works best.
                  </p>
                )}
                {draft.avatarUrl && (
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => updateField("avatarUrl", "")}
                  >
                    Use initials instead
                  </button>
                )}
              </div>
            </div>

            <div className={styles.twoCols}>
              <div className={styles.field}>
                <label htmlFor="profile-displayName" className={styles.label}>
                  Display name <span className={styles.required} aria-hidden="true">*</span>
                </label>
                <input
                  ref={nameInputRef}
                  id="profile-displayName"
                  className={styles.input}
                  value={draft.displayName}
                  maxLength={PROFILE_LIMITS.displayName}
                  placeholder="What should we call you?"
                  onChange={(event) => updateField("displayName", event.target.value)}
                  required
                  aria-invalid={fieldErrors.displayName ? true : undefined}
                  aria-describedby={fieldErrors.displayName ? "profile-displayName-error" : undefined}
                />
                {fieldErrors.displayName && (
                  <p className={styles.error} id="profile-displayName-error" role="alert">
                    {fieldErrors.displayName}
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="profile-role" className={styles.label}>
                  Role, course, or designation <span className={styles.optional}>(optional)</span>
                </label>
                <input
                  id="profile-role"
                  className={styles.input}
                  value={draft.role}
                  maxLength={PROFILE_LIMITS.role}
                  placeholder="Student, Frontend learner, Designer…"
                  onChange={(event) => updateField("role", event.target.value)}
                  aria-invalid={fieldErrors.role ? true : undefined}
                  aria-describedby={fieldErrors.role ? "profile-role-error" : undefined}
                />
                {fieldErrors.role && (
                  <p className={styles.error} id="profile-role-error" role="alert">
                    {fieldErrors.role}
                  </p>
                )}
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="profile-bio" className={styles.label}>
                Short bio <span className={styles.optional}>(optional)</span>
              </label>
              <textarea
                id="profile-bio"
                className={styles.textarea}
                rows={3}
                value={draft.bio}
                maxLength={PROFILE_LIMITS.bio}
                placeholder="A line or two about what you are learning and how you like to learn."
                onChange={(event) => updateField("bio", event.target.value)}
                aria-invalid={fieldErrors.bio ? true : undefined}
                aria-describedby={
                  fieldErrors.bio ? "profile-bio-error profile-bio-count" : "profile-bio-count"
                }
              />
              <div className={styles.fieldMeta}>
                {fieldErrors.bio ? (
                  <p className={styles.error} id="profile-bio-error" role="alert">
                    {fieldErrors.bio}
                  </p>
                ) : (
                  <span />
                )}
                <span className={styles.counter} id="profile-bio-count">
                  {draft.bio.length}/{PROFILE_LIMITS.bio}
                </span>
              </div>
            </div>
            </section>

            <section className={styles.formSection} aria-labelledby="profile-learning-title">
              <div className={styles.formSectionHead}>
                <h3 id="profile-learning-title">Learning</h3>
                <p>A handful of topics you are curious about right now.</p>
              </div>

            <div className={styles.field}>
              <div className={styles.interestsHead}>
                <label htmlFor="profile-interest" className={styles.label}>
                  Learning interests
                </label>
                <span className={styles.counter}>
                  {draft.interests.length}/{PROFILE_LIMITS.interests} topics
                </span>
              </div>
              <div className={styles.interestRow}>
                <input
                  ref={interestInputRef}
                  id="profile-interest"
                  className={styles.input}
                  value={interestInput}
                  maxLength={PROFILE_LIMITS.interest}
                  placeholder="Type a topic and press Enter"
                  onChange={(event) => {
                    setInterestInput(event.target.value);
                    setInterestError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === ",") {
                      event.preventDefault();
                      addInterest(interestInput);
                    }
                  }}
                  aria-invalid={interestError ? true : undefined}
                  aria-describedby={interestError ? "profile-interest-error" : "profile-interest-hint"}
                  disabled={draft.interests.length >= PROFILE_LIMITS.interests}
                />
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => addInterest(interestInput)}
                  disabled={!interestInput.trim() || draft.interests.length >= PROFILE_LIMITS.interests}
                >
                  <Plus size={14} aria-hidden="true" /> Add
                </button>
              </div>
              {interestError ? (
                <p className={styles.error} id="profile-interest-error" role="alert">
                  {interestError}
                </p>
              ) : (
                <p className={styles.hint} id="profile-interest-hint">
                  Add up to {PROFILE_LIMITS.interests} topics that you are exploring.
                </p>
              )}

              <div className={styles.suggestions} role="group" aria-label="Suggested topics">
                {INTEREST_SUGGESTIONS.map((topic) => {
                  const selected = draft.interests.some(
                    (interest) => interest.toLowerCase() === topic.toLowerCase()
                  );
                  return (
                    <button
                      key={topic}
                      type="button"
                      className={styles.suggestion}
                      onClick={() => addInterest(topic)}
                      disabled={selected || draft.interests.length >= PROFILE_LIMITS.interests}
                    >
                      <Plus size={11} aria-hidden="true" /> {topic}
                    </button>
                  );
                })}
              </div>

              {draft.interests.length > 0 && (
                <ul className={styles.chips}>
                  {draft.interests.map((interest) => (
                    <li key={interest} className={`${styles.chip} ${styles.chipEditable}`}>
                      <span>{interest}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${interest}`}
                        onClick={() => removeInterest(interest)}
                      >
                        <X size={12} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            </section>

            <section className={styles.formSection} aria-labelledby="profile-connect-title">
              <div className={styles.formSectionHead}>
                <h3 id="profile-connect-title">Connect</h3>
                <p>Optional links so classmates can find you.</p>
              </div>

              <div className={styles.twoCols}>
                <div className={styles.field}>
                  <label htmlFor="profile-githubUrl" className={styles.label}>
                    GitHub profile <span className={styles.optional}>(optional)</span>
                  </label>
                  <input
                    id="profile-githubUrl"
                    type="text"
                    inputMode="url"
                    autoCapitalize="none"
                    spellCheck={false}
                    className={styles.input}
                    value={draft.githubUrl}
                    maxLength={PROFILE_LIMITS.url}
                    placeholder="https://github.com/you"
                    onChange={(event) => updateField("githubUrl", event.target.value)}
                    aria-invalid={fieldErrors.githubUrl ? true : undefined}
                    aria-describedby={
                      fieldErrors.githubUrl ? "profile-githubUrl-error" : undefined
                    }
                  />
                  {fieldErrors.githubUrl && (
                    <p className={styles.error} id="profile-githubUrl-error" role="alert">
                      {fieldErrors.githubUrl}
                    </p>
                  )}
                </div>

                <div className={styles.field}>
                  <label htmlFor="profile-linkedinUrl" className={styles.label}>
                    LinkedIn profile <span className={styles.optional}>(optional)</span>
                  </label>
                  <input
                    id="profile-linkedinUrl"
                    type="text"
                    inputMode="url"
                    autoCapitalize="none"
                    spellCheck={false}
                    className={styles.input}
                    value={draft.linkedinUrl}
                    maxLength={PROFILE_LIMITS.url}
                    placeholder="https://linkedin.com/in/you"
                    onChange={(event) => updateField("linkedinUrl", event.target.value)}
                    aria-invalid={fieldErrors.linkedinUrl ? true : undefined}
                    aria-describedby={
                      fieldErrors.linkedinUrl ? "profile-linkedinUrl-error" : undefined
                    }
                  />
                  {fieldErrors.linkedinUrl && (
                    <p className={styles.error} id="profile-linkedinUrl-error" role="alert">
                      {fieldErrors.linkedinUrl}
                    </p>
                  )}
                </div>
              </div>

              <div className={styles.twoCols}>
                <div className={styles.field}>
                  <label htmlFor="profile-websiteUrl" className={styles.label}>
                    Website <span className={styles.optional}>(optional)</span>
                  </label>
                  <input
                    id="profile-websiteUrl"
                    type="text"
                    inputMode="url"
                    autoCapitalize="none"
                    spellCheck={false}
                    className={styles.input}
                    value={draft.websiteUrl}
                    maxLength={PROFILE_LIMITS.url}
                    placeholder="https://your-site.com"
                    onChange={(event) => updateField("websiteUrl", event.target.value)}
                    aria-invalid={fieldErrors.websiteUrl ? true : undefined}
                    aria-describedby={
                      fieldErrors.websiteUrl ? "profile-websiteUrl-error" : undefined
                    }
                  />
                  {fieldErrors.websiteUrl && (
                    <p className={styles.error} id="profile-websiteUrl-error" role="alert">
                      {fieldErrors.websiteUrl}
                    </p>
                  )}
                </div>

                <div className={styles.field}>
                  <label htmlFor="profile-email" className={styles.label}>
                    Email <span className={styles.optional}>(optional)</span>
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    inputMode="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    className={styles.input}
                    value={draft.email}
                    maxLength={PROFILE_LIMITS.email}
                    placeholder="you@example.com"
                    onChange={(event) => updateField("email", event.target.value)}
                    aria-invalid={fieldErrors.email ? true : undefined}
                    aria-describedby={
                      fieldErrors.email ? "profile-email-error" : "profile-email-hint"
                    }
                  />
                  {fieldErrors.email ? (
                    <p className={styles.error} id="profile-email-error" role="alert">
                      {fieldErrors.email}
                    </p>
                  ) : (
                    <p className={styles.hint} id="profile-email-hint">
                      Shows up as a mailto link on your profile.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <div className={styles.actions}>
              <button type="submit" className={styles.primary} disabled={saving}>
                {saving ? (
                  <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />
                ) : (
                  <Check size={15} aria-hidden="true" />
                )}
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                className={styles.secondary}
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </button>
              {saving && (
                <p className={styles.savingNote} role="status">
                  Saving your profile…
                </p>
              )}
            </div>
          </form>
        )}

        {profileHydrated && !editing && (
          <section className={styles.statsSection} aria-labelledby="profile-stats-title">
            <div className={styles.statsHead}>
              <div>
                <p className={styles.sectionEyebrow}>Quiet progress</p>
                <h2 id="profile-stats-title">Your learning so far</h2>
              </div>
              <Link href="/progress" className={styles.textLink}>
                Open progress <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </div>

            <div className={styles.statsGrid}>
              <article className={styles.statCard}>
                <span className={styles.statIcon}>
                  <Compass size={18} aria-hidden="true" />
                </span>
                <p className={styles.statLabel}>Learning maps</p>
                <p className={styles.statValue}>{statsHydrated ? mapOverview.totalMaps : "—"}</p>
                <p className={styles.statHint}>
                  {!statsHydrated
                    ? "Loading your activity…"
                    : personalMapCount > 0
                      ? `${personalMapCount} created by you · ${mapOverview.totalMaps - personalMapCount} ready-made`
                      : `${mapOverview.totalMaps} available to explore`}
                </p>
              </article>

              <article className={styles.statCard}>
                <span className={styles.statIcon}>
                  <CheckCircle2 size={18} aria-hidden="true" />
                </span>
                <p className={styles.statLabel}>Focus sessions</p>
                <p className={styles.statValue}>{statsHydrated ? sessions.length : "—"}</p>
                <p className={styles.statHint}>
                  {!statsHydrated
                    ? "Loading your activity…"
                    : sessions.length === 0
                      ? "No sessions logged yet"
                      : "Completed focus sessions"}
                </p>
              </article>

              <article className={styles.statCard}>
                <span className={styles.statIcon}>
                  <Clock size={18} aria-hidden="true" />
                </span>
                <p className={styles.statLabel}>Study time</p>
                <p className={styles.statValue}>
                  {statsHydrated ? formattedDuration.formatted : "—"}
                </p>
                <p className={styles.statHint}>
                  {!statsHydrated
                    ? "Loading your activity…"
                    : formattedDuration.hours === 0 && formattedDuration.mins === 0
                      ? "No study time yet"
                      : "Across all focus sessions"}
                </p>
              </article>

              <article className={styles.statCard}>
                <span className={styles.statIcon}>
                  <Flame size={18} aria-hidden="true" />
                </span>
                <p className={styles.statLabel}>Current streak</p>
                <p className={styles.statValue}>
                  {statsHydrated ? streak.currentStreak : "—"}
                  {statsHydrated && (
                    <span className={styles.statUnit}>
                      {streak.currentStreak === 1 ? "day" : "days"}
                    </span>
                  )}
                </p>
                <p className={styles.statHint}>
                  {!statsHydrated
                    ? "Loading your activity…"
                    : streak.studiedToday
                      ? "Studied today — keep it going"
                      : streak.currentStreak > 0
                        ? "Focus today to keep your streak"
                        : "Start a session to begin"}
                </p>
              </article>
            </div>
          </section>
        )}

        <div className={styles.feedbackPrompt}>
          <button
            ref={feedbackTriggerRef}
            type="button"
            className={styles.feedbackTrigger}
            onClick={openFeedback}
            aria-haspopup="dialog"
            aria-expanded={feedbackOpen}
          >
            <MessageSquare size={15} aria-hidden="true" />
            Give Feedback
          </button>
        </div>

        {feedbackOpen && (
          <div className="dialog-overlay" onClick={closeFeedback}>
            <div
              ref={feedbackDialogRef}
              className={`dialog-content ${styles.feedbackDialog}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="feedback-title"
              aria-describedby="feedback-intro"
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.feedbackHead}>
                <div>
                  <p className={styles.eyebrow}>
                    <MessageSquare size={14} /> Help Bibble grow
                  </p>
                  <h2 id="feedback-title">Feedback &amp; Bug Report</h2>
                </div>
                <button
                  ref={feedbackCloseRef}
                  type="button"
                  className={styles.feedbackClose}
                  onClick={closeFeedback}
                  disabled={feedbackSubmitting}
                  aria-label="Close feedback form"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>

              <p className={styles.feedbackIntro} id="feedback-intro">
                Share a thought, report something that feels off, or suggest what you&apos;d love to see next.
              </p>

              {feedbackNotice?.kind === "success" ? (
                <div className={styles.feedbackSuccess} role="status">
                  <span className={styles.feedbackSuccessIcon} aria-hidden="true">
                    <Check size={22} />
                  </span>
                  <h3>Feedback sent</h3>
                  <p>{feedbackNotice.text}</p>
                  <button
                    type="button"
                    className={`${styles.primary} ${styles.feedbackSubmit}`}
                    onClick={closeFeedback}
                    autoFocus
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form
                  className={styles.feedbackForm}
                  onSubmit={handleFeedbackSubmit}
                  noValidate
                  aria-busy={feedbackSubmitting}
                >
                  <fieldset
                    className={styles.typeField}
                    disabled={feedbackSubmitting}
                    aria-describedby={feedbackErrors.type ? "feedback-type-error" : undefined}
                  >
                    <legend>Feedback type</legend>
                    <div className={styles.typeOptions}>
                      {FEEDBACK_TYPE_OPTIONS.map((option) => (
                        <label key={option.value} className={styles.typeOption}>
                          <input
                            type="radio"
                            name="feedback-type"
                            value={option.value}
                            checked={feedbackType === option.value}
                            onChange={() => {
                              setFeedbackType(option.value);
                              clearFeedbackError("type");
                            }}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                    {feedbackErrors.type && (
                      <p className={styles.fieldError} id="feedback-type-error" role="alert">
                        {feedbackErrors.type}
                      </p>
                    )}
                  </fieldset>

                  <div className={styles.field}>
                    <label htmlFor="feedback-subject">
                      Subject <span className={styles.requiredMark} aria-hidden="true">*</span>
                    </label>
                    <input
                      id="feedback-subject"
                      name="subject"
                      value={feedbackSubject}
                      onChange={(event) => {
                        setFeedbackSubject(event.target.value);
                        clearFeedbackError("subject");
                      }}
                      maxLength={FEEDBACK_LIMITS.subject.max}
                      placeholder="A quick summary — e.g. Focus timer stops on mobile"
                      required
                      disabled={feedbackSubmitting}
                      aria-invalid={feedbackErrors.subject ? true : undefined}
                      aria-describedby={
                        feedbackErrors.subject
                          ? "feedback-subject-error feedback-subject-count"
                          : "feedback-subject-count"
                      }
                    />
                    <div className={styles.feedbackMeta}>
                      {feedbackErrors.subject ? (
                        <p className={styles.fieldError} id="feedback-subject-error" role="alert">
                          {feedbackErrors.subject}
                        </p>
                      ) : (
                        <span />
                      )}
                      <span className={styles.counter} id="feedback-subject-count">
                        {feedbackSubject.length}/{FEEDBACK_LIMITS.subject.max}
                      </span>
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="feedback-message">
                      Message <span className={styles.requiredMark} aria-hidden="true">*</span>
                    </label>
                    <textarea
                      id="feedback-message"
                      name="message"
                      value={feedbackMessage}
                      onChange={(event) => {
                        setFeedbackMessage(event.target.value);
                        clearFeedbackError("message");
                      }}
                      maxLength={FEEDBACK_LIMITS.message.max}
                      rows={5}
                      placeholder="Tell us what happened, what you expected, and anything that would help us understand."
                      required
                      disabled={feedbackSubmitting}
                      aria-invalid={feedbackErrors.message ? true : undefined}
                      aria-describedby={
                        feedbackErrors.message
                          ? "feedback-message-error feedback-message-count"
                          : "feedback-message-count"
                      }
                    />
                    <div className={styles.feedbackMeta}>
                      {feedbackErrors.message ? (
                        <p className={styles.fieldError} id="feedback-message-error" role="alert">
                          {feedbackErrors.message}
                        </p>
                      ) : (
                        <span />
                      )}
                      <span className={styles.counter} id="feedback-message-count">
                        {feedbackMessage.length}/{FEEDBACK_LIMITS.message.max}
                      </span>
                    </div>
                  </div>

                  <div className={styles.feedbackActions}>
                    <button
                      type="submit"
                      className={`${styles.primary} ${styles.feedbackSubmit}`}
                      disabled={feedbackSubmitting}
                    >
                      {feedbackSubmitting ? (
                        <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />
                      ) : (
                        <Send size={15} aria-hidden="true" />
                      )}
                      {feedbackSubmitting ? "Sending feedback…" : "Submit Feedback"}
                    </button>
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={closeFeedback}
                      disabled={feedbackSubmitting}
                    >
                      Cancel
                    </button>
                  </div>

                  {feedbackNotice?.kind === "error" && (
                    <p className={`${styles.feedbackNotice} ${styles.errorNotice}`} role="alert">
                      <AlertCircle size={16} aria-hidden="true" />
                      <span>{feedbackNotice.text}</span>
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
