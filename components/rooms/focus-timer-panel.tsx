"use client";

import type { NotificationSupport } from "@/hooks/use-timer-notifications";
import {
  BREAK_LENGTHS,
  getTimerModeInfo,
  type BreakLength,
  type TimerMode,
} from "@/lib/rooms/break-timer";
import {
  Bell,
  BellOff,
  CheckCircle2,
  Clock3,
  Coffee,
  FastForward,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { motion } from "motion/react";

interface FocusTimerPanelProps {
  mode?: TimerMode;
  minutes: number;
  formattedTime: string;
  active: boolean;
  onToggleActive: () => void;
  onCompleteEarly?: () => void;
  completeDisabled?: boolean;
  onReset?: () => void;
  isCompleted?: boolean;
  breakMinutes?: BreakLength | number;
  onSelectBreakMinutes?: (mins: number) => void;
  onStartBreak?: (mins: number) => void;
  onSkipBreak?: () => void;
  onResetBreak?: () => void;
  onStartNewSession?: () => void;
  notifications?: {
    enabled: boolean;
    permission: NotificationSupport;
    onToggle: () => void;
  };
}

export function FocusTimerPanel({
  mode = "focus",
  minutes,
  formattedTime,
  active,
  onToggleActive,
  onCompleteEarly,
  completeDisabled = false,
  onReset,
  isCompleted = false,
  breakMinutes = 5,
  onSelectBreakMinutes,
  onStartBreak,
  onSkipBreak,
  onResetBreak,
  onStartNewSession,
  notifications,
}: FocusTimerPanelProps) {
  const modeInfo = getTimerModeInfo(mode, active, isCompleted, minutes);

  return (
    <div className="focus-panel">
      <div className="focus-panel-heading">
        <span className="eyebrow">
          {mode === "break" ? <Coffee size={14} /> : <Clock3 size={14} />}
          {modeInfo.eyebrow}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className={`timer-mode-badge ${mode}`} data-testid="timer-mode-badge">
            {modeInfo.label}
          </span>
          <span>{modeInfo.headerText}</span>
        </div>
      </div>

      <div className="focus-clock">
        <motion.span
          animate={{ scale: active ? [1, 1.02, 1] : 1 }}
          transition={{ repeat: active ? Infinity : 0, duration: 2 }}
        >
          {formattedTime}
        </motion.span>
        <small>{modeInfo.statusText}</small>
      </div>

      {mode === "break" ? (
        /* Break Mode Controls */
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
          <button
            className="focus-button"
            onClick={onToggleActive}
            style={{ flex: 1, minWidth: "160px" }}
            aria-label={active ? "Pause break" : "Resume break"}
          >
            {active ? (
              <>
                <Pause size={17} /> Pause break
              </>
            ) : (
              <>
                <Play size={17} /> Resume break
              </>
            )}
          </button>

          {onSkipBreak && (
            <button
              type="button"
              className="focus-button focus-secondary-btn"
              onClick={onSkipBreak}
              title="Skip remaining break and return to focus"
              aria-label="Skip break"
            >
              <FastForward size={17} /> Skip break
            </button>
          )}

          {(onResetBreak || onReset) && (
            <button
              type="button"
              onClick={onResetBreak || onReset}
              className="room-icon-button"
              title="Reset break timer"
              aria-label="Reset break timer"
              style={{ width: "42px", height: "42px", alignSelf: "center" }}
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      ) : isCompleted ? (
        /* Focus Session Completed: Offer Break or New Session */
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "14px", alignItems: "center" }}>
          <div className="break-offer-card">
            <div className="break-offer-title">
              <Coffee size={16} />
              <span>Take a short break?</span>
            </div>
            <p className="break-offer-desc">Recharge with a calm breather before your next focus round.</p>
            <div className="break-pills-row" role="radiogroup" aria-label="Break length choice">
              {BREAK_LENGTHS.map((len) => (
                <button
                  key={len}
                  type="button"
                  role="radio"
                  aria-checked={breakMinutes === len}
                  className={`break-pill ${breakMinutes === len ? "active" : ""}`}
                  onClick={() => onSelectBreakMinutes?.(len)}
                >
                  {len} min
                </button>
              ))}
            </div>
            {onStartBreak && (
              <button
                type="button"
                className="focus-button break-start-btn"
                onClick={() => onStartBreak(breakMinutes)}
              >
                <Coffee size={17} /> Start {breakMinutes}-min break
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
            <button
              className="focus-button focus-secondary-btn"
              onClick={onStartNewSession || onToggleActive}
              style={{ flex: 1, minWidth: "160px" }}
            >
              <Play size={17} /> Start new focus session
            </button>

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
        </div>
      ) : (
        /* Regular Focus Mode Controls */
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
          <button
            className="focus-button"
            onClick={onToggleActive}
            style={{ flex: 1, minWidth: "160px" }}
          >
            {active ? (
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
              className="focus-button focus-secondary-btn"
              onClick={onCompleteEarly}
              disabled={completeDisabled}
              style={{
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
      )}

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
