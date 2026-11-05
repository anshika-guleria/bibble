"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { useDialog } from "@/hooks/use-dialog";
import { useStudyStats } from "@/hooks/use-study-stats";
import { useTheme } from "@/hooks/use-theme";
import styles from "./progress.module.css";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  Headphones,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

function formatSessionTimestamp(completedAt: string): string {
  const dateObj = new Date(completedAt);
  if (Number.isNaN(dateObj.getTime())) return "Unknown time";

  const isToday = dateObj.toDateString() === new Date().toDateString();
  const time = dateObj.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return isToday
    ? `Today at ${time}`
    : `${dateObj.toLocaleDateString([], { month: "short", day: "numeric" })} at ${time}`;
}

export default function ProgressPage() {
  const { motif } = useTheme();
  const {
    sessions,
    formattedDuration,
    streak,
    mapItems,
    mapOverview,
    hydrated,
    recordSession,
    resetStats,
  } = useStudyStats();

  // Filters for per-map progress section
  const [mapFilter, setMapFilter] = useState<"all" | "in-progress" | "completed" | "not-started">("all");

  // Modals
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const logDialogRef = useDialog<HTMLDivElement>(isLogModalOpen, () => setIsLogModalOpen(false));
  const resetDialogRef = useDialog<HTMLDivElement>(isResetModalOpen, () => setIsResetModalOpen(false));
  const logTitleId = useId();
  const resetTitleId = useId();
  const durationLabelId = useId();

  // Form states for manual session log
  const [selectedDuration, setSelectedDuration] = useState<number>(25);
  const [sessionTopic, setSessionTopic] = useState("");
  const [sessionNote, setSessionNote] = useState("");

  // Last 7 days helper for streak strip
  const last7Days = useMemo(() => {
    const days: { label: string; dateStr: string; active: boolean }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      const label = d.toLocaleDateString("en-US", { weekday: "narrow" });
      const active = streak.activeDates.includes(dateStr);
      days.push({ label, dateStr, active });
    }
    return days;
  }, [streak.activeDates]);

  // Filtered maps
  const filteredMaps = useMemo(() => {
    if (mapFilter === "all") return mapItems;
    return mapItems.filter((m) => m.status === mapFilter);
  }, [mapItems, mapFilter]);

  const handleQuickLog = (e: React.FormEvent) => {
    e.preventDefault();
    recordSession({
      minutes: selectedDuration,
      topic: sessionTopic.trim() || "Quiet Focus Session",
      note: sessionNote.trim() || undefined,
      completedAt: new Date().toISOString(),
    });
    setIsLogModalOpen(false);
    setSessionTopic("");
    setSessionNote("");
  };

  const handleDemoSession = () => {
    recordSession({
      minutes: 25,
      roomName: "Tea & Warm Light",
      topic: "Focus momentum",
      note: "Gentle first study sprint",
      completedAt: new Date().toISOString(),
    });
  };

  const handleConfirmReset = () => {
    resetStats();
    setIsResetModalOpen(false);
  };

  return (
    <div className={styles.progressPage}>
      <SiteHeader />

      <main id="main-content" tabIndex={-1} className={styles.container}>
        {/* Page Hero */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <span className={styles.heroEyebrow}>
              <span>{motif.brandEmoji}</span> My Learning Progress
            </span>
            <h1 className={styles.heroTitle}>
              Watch what you know <em>grow.</em>
            </h1>
            <p className={styles.heroSubtitle}>
              Celebrate quiet focus sessions, nurture your daily learning streak, and track the journey across all your knowledge maps.
            </p>
          </div>

          <div className={styles.heroActions}>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => setIsLogModalOpen(true)}
              title="Log a completed focus session"
            >
              <Plus size={16} /> Log focus session
            </button>
            <button
              type="button"
              className={styles.btnReset}
              onClick={() => setIsResetModalOpen(true)}
              title="Reset study stats and streak"
            >
              <RotateCcw size={14} /> Reset stats
            </button>
          </div>
        </section>

        {/* Metric Cards (KPIs) */}
        <section className={styles.statsGrid}>
          {/* Total Minutes Card */}
          <div className={styles.statCard}>
            <div className={styles.statCardHeader}>
              <span className={styles.statCardLabel}>Total Study Time</span>
              <div className={styles.statCardIcon}>
                <Clock size={18} />
              </div>
            </div>
            <div>
              <div className={styles.statCardValue}>
                {hydrated ? formattedDuration.formatted : "0 mins"}
              </div>
              <p className={styles.statCardSubtext}>
                <Sparkles size={14} />
                {hydrated
                  ? `${sessions.length} completed session${sessions.length === 1 ? "" : "s"}`
                  : "0 sessions completed"}
              </p>
            </div>
          </div>

          {/* Daily Streak Card */}
          <div className={styles.statCard}>
            <div className={styles.statCardHeader}>
              <span className={styles.statCardLabel}>Daily Streak</span>
              <div className={styles.statCardIcon}>
                <Flame size={18} />
              </div>
            </div>
            <div>
              <div className={styles.statCardValue}>
                {hydrated ? streak.currentStreak : 0}{" "}
                <em>{streak.currentStreak === 1 ? "day" : "days"}</em>
              </div>
              <p className={styles.statCardSubtext}>
                {streak.studiedToday ? (
                  <>
                    <CheckCircle2 size={14} style={{ color: "var(--status-live)" }} />
                    Studied today! Habit is active
                  </>
                ) : (
                  <>
                    <span>{motif.brandEmoji}</span>
                    {streak.currentStreak > 0
                      ? "Focus today to maintain streak"
                      : "Start a session to ignite streak"}
                  </>
                )}
              </p>
            </div>

            {/* 7-Day Activity Mini-strip */}
            <div className={styles.streakStrip} title="Your last 7 days of focus activity">
              {last7Days.map((d) => (
                <div key={d.dateStr} className={styles.streakDay}>
                  <div
                    className={`${styles.streakDayDot} ${
                      d.active ? styles.streakDayDotActive : ""
                    }`}
                  >
                    {d.active ? "✓" : "·"}
                  </div>
                  <span className={styles.streakDayLabel}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Map Progress Overview Card */}
          <div className={styles.statCard}>
            <div className={styles.statCardHeader}>
              <span className={styles.statCardLabel}>Maps in Progress</span>
              <div className={styles.statCardIcon}>
                <Compass size={18} />
              </div>
            </div>
            <div>
              <div className={styles.statCardValue}>
                {mapOverview.completedMaps + mapOverview.inProgressMaps}{" "}
                <em>/ {mapOverview.totalMaps}</em>
              </div>
              <p className={styles.statCardSubtext}>
                <Sparkles size={14} />
                {mapOverview.completedMaps} completed · {mapOverview.inProgressMaps} in progress
              </p>
            </div>
          </div>

          {/* Ideas / Bibbles Mastered Card */}
          <div className={styles.statCard}>
            <div className={styles.statCardHeader}>
              <span className={styles.statCardLabel}>Bibbles Grown</span>
              <div className={styles.statCardIcon}>
                <BookOpen size={18} />
              </div>
            </div>
            <div>
              <div className={styles.statCardValue}>
                {mapOverview.completedBibbles}{" "}
                <em>/ {mapOverview.totalBibbles}</em>
              </div>
              <p className={styles.statCardSubtext}>
                <CheckCircle2 size={14} />
                {mapOverview.averageProgress}% overall map momentum
              </p>
            </div>
          </div>
        </section>

        {/* Friendly Empty State for New Users */}
        {hydrated && sessions.length === 0 && (
          <section className={styles.emptyCard}>
            <div className={styles.emptyIconBadge}>
              <span>{motif.brandEmoji}</span>
            </div>
            <h2 className={styles.emptyTitle}>Your study garden is waiting to bloom</h2>
            <p className={styles.emptyDesc}>
              You haven&apos;t recorded any focus sessions yet. Step into a cozy study room to start your first session, or wander through our learning maps to begin tracking your knowledge. All progress stays safely in your browser!
            </p>
            <div className={styles.emptyActions}>
              <Link href="/rooms" className={styles.btnPrimary}>
                <Headphones size={15} /> Find a study room
              </Link>
              <Link href="/explore" className={styles.btnSecondary}>
                <Compass size={15} /> Explore learning maps
              </Link>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={handleDemoSession}
                title="Log a sample 25-minute focus session to see your dashboard in action"
              >
                <Sparkles size={15} /> Log 25m demo session
              </button>
            </div>
          </section>
        )}

        {/* Per-Map Progress Section */}
        <section className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Per-Map Learning Progress</h2>
              <p className={styles.sectionSubtitle}>
                See how far you&apos;ve journeyed across each knowledge map.
              </p>
            </div>

            <div className={styles.filterTabs} role="group" aria-label="Filter maps by progress">
              <button
                type="button"
                className={`${styles.filterTab} ${mapFilter === "all" ? styles.filterTabActive : ""}`}
                aria-pressed={mapFilter === "all"}
                onClick={() => setMapFilter("all")}
              >
                All ({mapItems.length})
              </button>
              <button
                type="button"
                className={`${styles.filterTab} ${mapFilter === "in-progress" ? styles.filterTabActive : ""}`}
                aria-pressed={mapFilter === "in-progress"}
                onClick={() => setMapFilter("in-progress")}
              >
                In progress ({mapOverview.inProgressMaps})
              </button>
              <button
                type="button"
                className={`${styles.filterTab} ${mapFilter === "completed" ? styles.filterTabActive : ""}`}
                aria-pressed={mapFilter === "completed"}
                onClick={() => setMapFilter("completed")}
              >
                Completed ({mapOverview.completedMaps})
              </button>
              <button
                type="button"
                className={`${styles.filterTab} ${mapFilter === "not-started" ? styles.filterTabActive : ""}`}
                aria-pressed={mapFilter === "not-started"}
                onClick={() => setMapFilter("not-started")}
              >
                Not started ({mapOverview.notStartedMaps})
              </button>
            </div>
          </div>

          {/* Maps Grid */}
          <div className={styles.mapGrid}>
            {filteredMaps.map((map) => {
              const statusClass =
                map.status === "completed"
                  ? styles.statusCompleted
                  : map.status === "in-progress"
                  ? styles.statusInProgress
                  : styles.statusNotStarted;

              const statusText =
                map.status === "completed"
                  ? "Completed"
                  : map.status === "in-progress"
                  ? "In progress"
                  : "Not started";

              return (
                <div key={map.id} className={styles.mapCard}>
                  <div>
                    <div className={styles.mapCardTop}>
                      <span className={styles.categoryBadge}>
                        <span
                          className={styles.accentDot}
                          style={{
                            backgroundColor:
                              map.accent === "green"
                                ? "#10b981"
                                : map.accent === "pink"
                                ? "#ec4899"
                                : map.accent === "blue"
                                ? "#3b82f6"
                                : map.accent === "peach"
                                ? "#f97316"
                                : "var(--primary)",
                          }}
                        />
                        {map.category}
                      </span>
                      <span className={`${styles.statusPill} ${statusClass}`}>
                        {statusText}
                      </span>
                    </div>

                    <h3 className={styles.mapTitle}>{map.title}</h3>
                    <p className={styles.mapDescription}>{map.description}</p>

                    <div className={styles.progressSection}>
                      <div className={styles.progressLabelRow}>
                        <span>Progress</span>
                        <strong>{map.progress}%</strong>
                      </div>
                      <div className={styles.progressBarTrack}>
                        <div
                          className={styles.progressBarFill}
                          style={{ width: `${Math.min(100, Math.max(0, map.progress))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={styles.mapCardFooter}>
                    <span className={styles.bibbleCountText}>
                      {map.completedBibbles} of {map.totalBibbles} bibbles grown
                    </span>
                    <Link href={`/map/${map.id}`} className={styles.openMapLink}>
                      Open map <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent Focus Sessions Log */}
        {hydrated && sessions.length > 0 && (
          <section className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Completed Focus Sessions</h2>
                <p className={styles.sectionSubtitle}>
                  Your local history of quiet learning moments.
                </p>
              </div>
              <span className={styles.bibbleCountText}>
                {sessions.length} recorded session{sessions.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className={styles.sessionsList}>
              {sessions.slice(0, 8).map((session) => {
                const formattedDate = formatSessionTimestamp(session.completedAt);

                return (
                  <div key={session.id} className={styles.sessionItem}>
                    <div className={styles.sessionInfo}>
                      <div className={styles.sessionIcon}>
                        <Clock size={18} />
                      </div>
                      <div>
                        <div className={styles.sessionTopic}>
                          {session.roomName || session.topic || "Focus session"}
                        </div>
                        <div className={styles.sessionDate}>
                          {formattedDate}
                          {session.note && ` · ${session.note}`}
                        </div>
                      </div>
                    </div>

                    <div className={styles.sessionBadge}>
                      +{session.minutes} min{session.minutes === 1 ? "" : "s"}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Quick Log Session Modal */}
      {isLogModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsLogModalOpen(false)}>
          <div
            ref={logDialogRef}
            className={styles.modalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby={logTitleId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 id={logTitleId} className={styles.modalTitle}>Log Focus Session</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsLogModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickLog}>
              <div className={styles.modalBody}>
                <span id={durationLabelId} className={styles.formLabel}>Choose session length</span>
                <div className={styles.quickDurations} role="group" aria-labelledby={durationLabelId}>
                  {[15, 25, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      className={`${styles.quickDurationBtn} ${
                        selectedDuration === mins ? styles.quickDurationBtnActive : ""
                      }`}
                      aria-pressed={selectedDuration === mins}
                      onClick={() => setSelectedDuration(mins)}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>

                <div className={styles.formField}>
                  <label htmlFor="session-topic" className={styles.formLabel}>
                    Topic or room (optional)
                  </label>
                  <input
                    id="session-topic"
                    data-autofocus
                    type="text"
                    className={styles.formInput}
                    placeholder="e.g. DSA Practice, Quiet Reading, Tea Table"
                    value={sessionTopic}
                    onChange={(e) => setSessionTopic(e.target.value)}
                  />
                </div>

                <div className={styles.formField}>
                  <label htmlFor="session-note" className={styles.formLabel}>
                    Reflections or note (optional)
                  </label>
                  <input
                    id="session-note"
                    type="text"
                    className={styles.formInput}
                    placeholder="What did you explore during this time?"
                    value={sessionNote}
                    onChange={(e) => setSessionNote(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setIsLogModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  Save session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsResetModalOpen(false)}>
          <div
            ref={resetDialogRef}
            className={styles.modalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby={resetTitleId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 id={resetTitleId} className={styles.modalTitle}>Reset Study Stats?</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsResetModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ margin: "0 0 12px" }}>
                This will clear your completed focus sessions, daily streak, and total study minutes from this browser.
              </p>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
                Your saved maps and node progress will remain intact. This action cannot be undone.
              </p>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.btnSecondary}
                data-autofocus
                onClick={() => setIsResetModalOpen(false)}
              >
                Keep my stats
              </button>
              <button
                type="button"
                className={styles.btnDanger}
                onClick={handleConfirmReset}
              >
                <Trash2 size={15} /> Yes, reset stats
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
