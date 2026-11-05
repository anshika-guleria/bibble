"use client";

import type { NotificationSupport } from "@/hooks/use-timer-notifications";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { Bell, BellOff, CheckCircle2, Clock3, Pause, Play, RotateCcw } from "lucide-react";
import { motion } from "motion/react";

interface FocusTimerPanelProps {
  minutes: number;
  formattedTime: string;
  active: boolean;
  onToggleActive: () => void;
  onCompleteEarly?: () => void;
  completeDisabled?: boolean;
  onReset?: () => void;
  isCompleted?: boolean;
  notifications?: {
    enabled: boolean;
    permission: NotificationSupport;
    onToggle: () => void;
  };
}

export function FocusTimerPanel({
  minutes,
  formattedTime,
  active,
  onToggleActive,
  onCompleteEarly,
  completeDisabled = false,
  onReset,
  isCompleted = false,
  notifications,
}: FocusTimerPanelProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="focus-panel">
      <div className="focus-panel-heading">
        <span className="eyebrow">
          <Clock3 size={14} /> Shared focus timer
        </span>
        <span>Session goal · {minutes} min</span>
      </div>
      <div className="focus-clock">
        <motion.span
          animate={{ scale: active && !prefersReducedMotion ? [1, 1.02, 1] : 1 }}
          transition={{
            repeat: active && !prefersReducedMotion ? Infinity : 0,
            duration: prefersReducedMotion ? 0 : 2,
          }}
        >
          {formattedTime}
        </motion.span>
        <small>
          {isCompleted
            ? "🎉 Session completed & logged to your progress!"
            : active
            ? "✨ The room is in focus mode"
            : "Ready when you are"}
        </small>
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
        <button
          className="focus-button"
          onClick={onToggleActive}
          style={{ flex: 1, minWidth: "160px" }}
        >
          {isCompleted ? (
            <>
              <Play size={17} /> Start new session
            </>
          ) : active ? (
            <>
              <Pause size={17} /> Pause focus
            </>
          ) : (
            <>
              <Play size={17} /> Start focus session
            </>
          )}
        </button>

        {onCompleteEarly && (
          <button
            type="button"
            className="focus-button"
            onClick={onCompleteEarly}
            disabled={completeDisabled}
            style={{
              background: "var(--surface-soft)",
              color: "var(--primary)",
              border: "1.5px solid var(--border-subtle)",
              cursor: completeDisabled ? "not-allowed" : "pointer",
              opacity: completeDisabled ? 0.55 : 1,
            }}
            title={
              completeDisabled
                ? "Start the timer first, then you can log the time you focused"
                : "Stop the timer and log the time you focused to your progress"
            }
          >
            <CheckCircle2 size={17} /> Complete &amp; log
          </button>
        )}

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="room-icon-button"
            title="Reset timer"
            aria-label="Reset timer"
            style={{ width: "42px", height: "42px", alignSelf: "center" }}
          >
            <RotateCcw size={16} />
          </button>
        )}
      </div>

      {notifications && notifications.permission !== "unsupported" && (
        <div className="focus-notify">
          <button
            type="button"
            className="focus-notify-button"
            onClick={notifications.onToggle}
            aria-pressed={notifications.enabled}
          >
            {notifications.enabled ? <Bell size={15} /> : <BellOff size={15} />}
            {notifications.enabled ? "Timer alerts on" : "Alert me when the timer ends"}
          </button>
          {notifications.permission === "denied" && (
            <small>Notifications are blocked in your browser settings for this site.</small>
          )}
        </div>
      )}
    </div>
  );
}
