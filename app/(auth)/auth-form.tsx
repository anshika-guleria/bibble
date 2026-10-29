"use client";

import { useActionState, useState } from "react";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { login, signup } from "@/app/actions/auth";
import { passwordRequirements } from "@/lib/auth/validation";
import { ThemePicker } from "@/components/ui/theme-picker";
import { useTheme } from "@/hooks/use-theme";
import styles from "./auth.module.css";

type AuthMode = "login" | "signup";
type FieldErrors = Record<string, string | string[]>;
type FormState = { message?: string; fieldErrors?: FieldErrors; errors?: FieldErrors };

const passwordChecks = [
  (value: string) => value.length >= 12,
  (value: string) => /[A-Z]/.test(value),
  (value: string) => /[a-z]/.test(value),
  (value: string) => /\d/.test(value),
  (value: string) => /[^A-Za-z0-9]/.test(value),
];

function errorText(errors: FieldErrors | undefined, field: string) {
  const error = errors?.[field];
  return Array.isArray(error) ? error[0] : error;
}

function isConfirmationMessage(message: string | undefined) {
  return Boolean(message?.startsWith("Account created"));
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const { motif } = useTheme();
  const isSignup = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [editedFields, setEditedFields] = useState<Record<string, boolean>>({});
  const [state, formAction, pending] = useActionState(
    isSignup ? signup : login,
    undefined,
  );
  const formState = state as FormState | undefined;
  const fieldErrors = formState?.fieldErrors ?? formState?.errors;
  const markEdited = (field: string) => {
    setEditedFields((current) => ({ ...current, [field]: true }));
  };
  const visibleError = (field: string) =>
    editedFields[field] ? undefined : errorText(fieldErrors, field);
  const passwordError = visibleError("password");
  const confirmPasswordMismatch =
    (confirmPassword.length > 0 || hasSubmitted) && password !== confirmPassword;
  const confirmPasswordError =
    visibleError("confirmPassword") ??
    (confirmPasswordMismatch ? "Passwords do not match." : undefined);
  const message = formState?.message;
  const isConfirmation = isConfirmationMessage(message);
  const generalMessageVisible =
    Boolean(message) && (isConfirmation || Object.keys(editedFields).length === 0);
  const metRequirements = passwordChecks.filter((check) => check(password)).length;
  const submitLabel = isSignup
    ? pending
      ? "Creating account…"
      : "Create account"
    : pending
      ? "Logging in…"
      : "Log in";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className="brand">
          <span className="brand-mark">{motif.brandEmoji}</span>
          <span>Bibble</span>
        </Link>
        <div className={styles.headerActions}>
          <ThemePicker compact />
          <Link href="/" className={styles.back}>
            Keep browsing <ArrowRight size={15} />
          </Link>
        </div>
      </header>
      <section className={styles.shell} aria-labelledby="auth-title">
        <span className={"eyebrow " + styles.eyebrow}>
          <Sparkles size={14} /> Your little learning corner
        </span>
        <h1 id="auth-title" className={styles.title}>
          {isSignup ? "Make it yours." : "Welcome back."}
        </h1>
        <p className={styles.copy}>
          {isSignup
            ? "Create an account to keep your Bibble identity close. You can still browse every sample map and study room without one."
            : "Log in to your Bibble account. Browsing, previews, and map-making are always open."}
        </p>
        <form
          className={styles.form}
          action={formAction}
          onSubmit={() => {
            setHasSubmitted(true);
            setEditedFields({});
          }}
        >
          <fieldset className={styles.fields} disabled={pending}>
            {isSignup && (
              <div className={styles.field}>
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  name="name"
                  autoComplete="name"
                  placeholder="Ada Lovelace"
                  minLength={2}
                  maxLength={50}
                  value={name}
                  aria-invalid={Boolean(visibleError("name"))}
                  aria-describedby={visibleError("name") ? "name-error" : undefined}
                  onChange={(event) => {
                    setName(event.target.value);
                    markEdited("name");
                  }}
                  required
                />
                {visibleError("name") && (
                  <p id="name-error" className={styles.fieldError} role="alert">
                    {visibleError("name")}
                  </p>
                )}
              </div>
            )}
            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                aria-invalid={Boolean(visibleError("email"))}
                aria-describedby={visibleError("email") ? "email-error" : undefined}
                onChange={(event) => {
                  setEmail(event.target.value);
                  markEdited("email");
                }}
                required
              />
              {visibleError("email") && (
                <p id="email-error" className={styles.fieldError} role="alert">
                  {visibleError("email")}
                </p>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="password">Password</label>
              <div className={styles.inputWrap}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  placeholder={isSignup ? "Create a password" : "Your password"}
                  value={password}
                  aria-describedby={
                    isSignup
                      ? passwordError
                        ? "password-help password-error"
                        : "password-help"
                      : passwordError
                        ? "password-error"
                        : undefined
                  }
                  aria-invalid={Boolean(passwordError)}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    markEdited("password");
                  }}
                  required
                />
                <button
                  type="button"
                  className={styles.reveal}
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {isSignup && (
                <div id="password-help" className={styles.requirements}>
                  <p className={styles.requirementsHead}>
                    <span>Password checklist</span>
                    <span className={styles.requirementsSummary} aria-live="polite">
                      {metRequirements} of {passwordRequirements.length} met
                    </span>
                  </p>
                  <ul className={styles.requirementList}>
                    {passwordRequirements.map((requirement, index) => {
                      const met = passwordChecks[index](password);
                      return (
                        <li
                          key={requirement}
                          className={met ? styles.requirementMet : styles.requirement}
                        >
                          <span className={styles.requirementMark} aria-hidden="true">
                            {met && <Check size={12} />}
                          </span>
                          {requirement}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {passwordError && (
                <p id="password-error" className={styles.fieldError} role="alert">
                  {passwordError}
                </p>
              )}
            </div>
            {isSignup && (
              <div className={styles.field}>
                <label htmlFor="confirmPassword">Confirm password</label>
                <div className={styles.inputWrap}>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    aria-invalid={Boolean(confirmPasswordError)}
                    aria-describedby={
                      confirmPasswordError ? "confirm-password-error" : undefined
                    }
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      markEdited("confirmPassword");
                    }}
                    required
                  />
                  <button
                    type="button"
                    className={styles.reveal}
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    aria-pressed={showConfirmPassword}
                  >
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {confirmPasswordError && (
                  <p id="confirm-password-error" className={styles.fieldError} role="alert">
                    {confirmPasswordError}
                  </p>
                )}
              </div>
            )}
            {generalMessageVisible && (
              <p
                className={isConfirmation ? styles.messageSuccess : styles.messageError}
                role={isConfirmation ? "status" : "alert"}
              >
                {isConfirmation && (
                  <Check size={16} className={styles.messageIcon} aria-hidden="true" />
                )}
                <span>{message}</span>
              </p>
            )}
            <button className={styles.submit} type="submit" disabled={pending}>
              {pending ? (
                <span className={styles.spinner} aria-hidden="true" />
              ) : (
                <ArrowRight size={16} aria-hidden="true" />
              )}
              <span>{submitLabel}</span>
            </button>
          </fieldset>
        </form>
        <p className={styles.switch}>
          {isSignup ? (
            <>
              Already have an account? <Link href="/login">Log in</Link>
            </>
          ) : (
            <>
              New here? <Link href="/signup">Create an account</Link>
            </>
          )}
        </p>
        <p className={styles.note}>
          Your password is securely handled by Supabase Auth and is never stored in plaintext.
        </p>
      </section>
    </main>
  );
}
