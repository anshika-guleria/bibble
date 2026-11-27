"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useDialog } from "@/hooks/use-dialog";
import { useReviewQueue } from "@/hooks/use-review-queue";
import { ReviewSessionManager, type SessionAnalytics } from "@/lib/reviews/session";
import type { ReviewRating } from "@/types/review";
import { BookOpen, CheckCircle, ExternalLink, Sparkles, X } from "lucide-react";
import styles from "./review-session.module.css";

interface ReviewSessionModalProps {
  open: boolean;
  onClose: () => void;
  onComplete?: (analytics: SessionAnalytics) => void;
}

export function ReviewSessionModal({ open, onClose, onComplete }: ReviewSessionModalProps) {
  const dialogRef = useDialog<HTMLDivElement>(open, onClose);
  const { dueItems, submitCardReview, getBibbleDetails, refresh } = useReviewQueue();
  const [, setRerenderKey] = useState(0);

  // Instantiate session manager when modal opens and start it immediately
  const manager = useMemo(() => {
    if (!open) return null;
    const m = new ReviewSessionManager(dueItems);
    m.start();
    return m;
  }, [open, dueItems]);

  const currentState = manager?.getState() ?? "finished";
  const currentItem = manager?.getCurrentItem() ?? null;
  const progress = manager?.getProgress() ?? { current: 0, total: 0, pendingRequeue: 0 };
  const analytics = manager?.getAnalytics() ?? null;

  const currentBibble = useMemo(() => {
    if (!currentItem) return null;
    return getBibbleDetails(currentItem.mapId, currentItem.nodeId);
  }, [currentItem, getBibbleDetails]);

  const handleReveal = useCallback(() => {
    if (!manager || manager.getState() !== "prompt") return;
    manager.reveal();
    setRerenderKey((k) => k + 1);
  }, [manager]);

  const handleGrade = useCallback(
    (rating: ReviewRating) => {
      if (!manager || !currentItem || manager.getState() !== "revealed") return;
      submitCardReview(currentItem, rating);
      const outcome = manager.grade(rating);
      setRerenderKey((k) => k + 1);

      if (outcome.isSessionFinished) {
        refresh();
        onComplete?.(manager.getAnalytics());
      }
    },
    [manager, currentItem, submitCardReview, refresh, onComplete],
  );

  // Keyboard shortcut listener
  useEffect(() => {
    if (!open || !manager) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!manager) return;

      const state = manager.getState();
      if (state === "prompt" && e.code === "Space") {
        e.preventDefault();
        handleReveal();
      } else if (state === "revealed") {
        if (e.key === "1") {
          e.preventDefault();
          handleGrade("again");
        } else if (e.key === "2") {
          e.preventDefault();
          handleGrade("hard");
        } else if (e.key === "3") {
          e.preventDefault();
          handleGrade("good");
        } else if (e.key === "4") {
          e.preventDefault();
          handleGrade("easy");
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, manager, handleReveal, handleGrade]);

  if (!open) return null;

  const progressPercent =
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 100;

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Active Recall Review Session"
      >
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <BookOpen size={18} className="text-primary" />
            <span>Active Recall Review</span>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close review session"
          >
            <X size={18} />
          </button>
        </div>

        {currentState !== "finished" && (
          <div className={styles.progressBar}>
            <div className={styles.progressTrack} style={{ width: `${progressPercent}%` }} />
          </div>
        )}

        <div className={styles.content}>
          {currentState === "finished" ? (
            <div className={styles.celebrationContainer}>
              <div className={styles.celebrationIcon}>
                <Sparkles size={28} />
              </div>
              <h3 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>Session Completed! 🎉</h3>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "14px" }}>
                Great work strengthening your neural pathways with active recall.
              </p>

              {analytics && (
                <div className={styles.statsGrid}>
                  <div className={styles.statBox}>
                    <span className={styles.statVal}>{analytics.totalReviewed}</span>
                    <span className={styles.statLbl}>Cards Reviewed</span>
                  </div>
                  <div className={styles.statBox}>
                    <span className={styles.statVal}>{analytics.retentionRate}%</span>
                    <span className={styles.statLbl}>Retention Rate</span>
                  </div>
                  <div className={styles.statBox}>
                    <span className={styles.statVal}>{analytics.cardsRequeuedCount}</span>
                    <span className={styles.statLbl}>Reinforced</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                className={styles.revealBtn}
                onClick={onClose}
                style={{ width: "100%", justifyContent: "center" }}
              >
                <CheckCircle size={18} />
                Finish Review
              </button>
            </div>
          ) : currentItem ? (
            <div className={styles.cardContainer}>
              <div>
                <div className={styles.cardMeta}>
                  <span>{currentItem.mapTitle ?? "Learning Map"}</span>
                  <div className={styles.badges}>
                    {progress.pendingRequeue > 0 && (
                      <span className={`${styles.badge} ${styles.badgeRequeue}`}>
                        +{progress.pendingRequeue} Re-queued
                      </span>
                    )}
                    <span
                      className={`${styles.badge} ${
                        currentItem.isOverdue ? styles.badgeOverdue : styles.badgeDue
                      }`}
                    >
                      {currentItem.isOverdue ? "Overdue" : "Due"}
                    </span>
                  </div>
                </div>

                <h2 className={styles.nodeTitle} style={{ marginTop: 12 }}>
                  {currentItem.nodeTitle ?? "Review Concept"}
                </h2>

                <p className={styles.promptHelp} style={{ marginTop: 6 }}>
                  Can you recall this concept&apos;s key ideas, definitions, and applications?
                </p>
              </div>

              {currentState === "prompt" ? (
                <div className={styles.revealAction}>
                  <button type="button" className={styles.revealBtn} onClick={handleReveal}>
                    <span>Reveal Details</span>
                    <span className={styles.shortcutHint}>Space</span>
                  </button>
                </div>
              ) : (
                <div className={styles.revealedSection}>
                  {currentBibble?.description && (
                    <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6 }}>
                      {currentBibble.description}
                    </p>
                  )}

                  {currentBibble?.notes && (
                    <div className={styles.notesBlock}>
                      <strong style={{ display: "block", marginBottom: 4, fontSize: "12px", color: "var(--muted)" }}>
                        Concept Notes:
                      </strong>
                      {currentBibble.notes}
                    </div>
                  )}

                  {currentBibble?.resources && currentBibble.resources.length > 0 && (
                    <div className={styles.resourcesList}>
                      <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Resources:</span>
                      {currentBibble.resources.map((res) => (
                        <a
                          key={res.id}
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.resourceLink}
                        >
                          <ExternalLink size={13} />
                          <span>{res.label}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  <div className={styles.gradingActions}>
                    <button
                      type="button"
                      className={`${styles.gradeBtn} ${styles.gradeAgain}`}
                      onClick={() => handleGrade("again")}
                    >
                      <span className={styles.keyKbd}>1</span>
                      <span>Again</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.gradeBtn} ${styles.gradeHard}`}
                      onClick={() => handleGrade("hard")}
                    >
                      <span className={styles.keyKbd}>2</span>
                      <span>Hard</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.gradeBtn} ${styles.gradeGood}`}
                      onClick={() => handleGrade("good")}
                    >
                      <span className={styles.keyKbd}>3</span>
                      <span>Good</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.gradeBtn} ${styles.gradeEasy}`}
                      onClick={() => handleGrade("easy")}
                    >
                      <span className={styles.keyKbd}>4</span>
                      <span>Easy</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "32px 16px" }}>
              <p style={{ color: "var(--muted)" }}>All caught up! No reviews due right now.</p>
              <button
                type="button"
                className={styles.revealBtn}
                onClick={onClose}
                style={{ margin: "16px auto 0" }}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
