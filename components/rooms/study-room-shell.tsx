"use client";

import { AmbientSound, type Soundscape } from "@/components/rooms/ambient-sound";
import { FocusTimerPanel } from "@/components/rooms/focus-timer-panel";
import { RoomGuidelines } from "@/components/rooms/room-guidelines";
import { StudyRoomScene } from "@/components/rooms/study-room-scene";
import { StudyRoomSidebar } from "@/components/rooms/study-room-sidebar";
import { ThemePicker } from "@/components/ui/theme-picker";
import { useFocusTimer } from "@/hooks/use-focus-timer";
import { useTimerNotifications } from "@/hooks/use-timer-notifications";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useTheme } from "@/hooks/use-theme";
import type { StudyRoom } from "@/types/room";
import { recordFocusSession } from "@/lib/progress";
import { ArrowLeft, Bell, BellOff, BookOpen, Headphones, Sparkles, Users } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

const initialPeople = ["Mina", "Noah", "Leah", "Ari"];
const defaultNotes = [
  "Finish one small thing before the timer ends.",
  "No need to rush. Showing up counts.",
];

export function StudyRoomShell({ room }: { room: StudyRoom }) {
  const { motif } = useTheme();

  const [joined, setJoined] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [note, setNote] = useState("");
  const [notes, setNotes] = useLocalStorage<string[]>(`bibble-room-notes-${room.id}`, defaultNotes);
  const [soundscape, setSoundscape] = useState<Soundscape>("off");
  const [lampOn, setLampOn] = useState(true);
  const [catHearts, setCatHearts] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const guidelinesButtonRef = useRef<HTMLButtonElement>(null);

  const closeGuidelines = useCallback(() => {
    setGuidelinesOpen(false);
    guidelinesButtonRef.current?.focus();
  }, []);

  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // A timer run may only ever record one session, whether it finishes
  // naturally or through "Complete & log" (which can be clicked repeatedly).
  const runIdRef = useRef(0);
  const loggedRunIdRef = useRef<number | null>(null);

  const handleSessionComplete = useCallback(() => {
    if (loggedRunIdRef.current === runIdRef.current) return;
    loggedRunIdRef.current = runIdRef.current;

    recordFocusSession({
      minutes: room.minutes,
      roomId: room.id,
      roomName: room.name,
      topic: room.topic,
      completedAt: new Date().toISOString(),
    });
    triggerToast(`🎉 Completed a ${room.minutes}-min session in ${room.name}! Logged to My Progress.`);
  }, [room, triggerToast]);

  const timerAlerts = useTimerNotifications();

  const handleTimerFinished = useCallback(() => {
    // The timer can report completion more than once for one run, so only alert the first time.
    const alreadyHandled = loggedRunIdRef.current === runIdRef.current;
    handleSessionComplete();
    if (alreadyHandled) return;
    timerAlerts.notify("Focus session finished", `Nice work, your ${room.minutes}-min session in ${room.name} is done.`);
  }, [handleSessionComplete, timerAlerts, room]);

  const { active, formattedTime, toggleTimer, resetTimer, isCompleted, setIsCompleted } = useFocusTimer(
    room.minutes,
    handleTimerFinished
  );

  const handleAlertsToggle = async () => {
    const result = await timerAlerts.toggle();
    if (result === "enabled") triggerToast("Timer alerts on. We will notify you when the session ends 🔔");
    else if (result === "disabled") triggerToast("Timer alerts turned off");
    else if (result === "denied") triggerToast("Notifications are blocked, allow them in your browser settings to get alerts");
    else if (result === "unsupported") triggerToast("This browser can't show notifications. You'll still see in-page alerts.");
  };

  const handleTimerToggle = () => {
    if (isCompleted) runIdRef.current += 1;
    toggleTimer();
  };

  const handleTimerReset = () => {
    runIdRef.current += 1;
    resetTimer();
  };

  const handleManualComplete = () => {
    handleSessionComplete();
    setIsCompleted(true);
  };

  const petCat = () => {
    setCatHearts((prev) => prev + 1);
    triggerToast(`Purrrr... Mochi the study cat wearing ${motif.catAccessory} feels loved! 🐱💖`);
  };

  const sipTea = () => {
    triggerToast(motif.sipToast);
  };

  const toggleLamp = () => {
    setLampOn((v) => !v);
    triggerToast(!lampOn ? "Warm desk lamp turned on 💡" : "Desk lamp dimmed 🌙");
  };

  const handleAddNote = (event: React.FormEvent) => {
    event.preventDefault();
    if (note.trim()) {
      setNotes((current) => [...current, note.trim()]);
      setNote("");
      triggerToast("Note added to the room board 📝");
    }
  };

  return (
    <main className="room-page">
      <header className="room-header">
        <Link href="/rooms" className="back-link">
          <ArrowLeft size={15} /> All rooms
        </Link>
        <Link href="/" className="brand">
          <span className="brand-mark">{motif.brandEmoji}</span>
          <span>Bibble</span>
        </Link>
        <div className="room-header-actions">
          <ThemePicker compact />
          {/* Same switch as "Timer alerts" in the focus timer panel: one preference, two controls. */}
          <button
            type="button"
            className="room-icon-button"
            aria-label="Room notifications"
            aria-pressed={timerAlerts.enabled}
            title={timerAlerts.enabled ? "Notifications on" : "Notifications off"}
            onClick={handleAlertsToggle}
          >
            {timerAlerts.enabled ? <Bell size={17} /> : <BellOff size={17} />}
          </button>
        </div>
      </header>

      <p className="sr-only" role="status" aria-live="polite">
        {timerAlerts.enabled ? "Room notifications on" : "Room notifications off"}
      </p>

      {toastMessage && (
        <motion.div
          className="cozy-toast"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          <Sparkles size={15} /> {toastMessage}
        </motion.div>
      )}

      <div className="room-layout">
        <section className="room-main">
          {/* Interactive 2D Roomscape Scene */}
          <StudyRoomScene
            room={room}
            soundscape={soundscape}
            lampOn={lampOn}
            catHearts={catHearts}
            onPetCat={petCat}
            onSipTea={sipTea}
            onToggleLamp={toggleLamp}
          />

          <div className="room-title-row">
            <div>
              <span className="eyebrow">
                <Headphones size={14} /> {room.topic}
              </span>
              <h1>{room.name}</h1>
              <p>{room.description}</p>
            </div>
            <div className="room-title-actions">
              <div className="room-live-count">
                <Users size={16} />
                <strong>{room.participants + (joined ? 1 : 0)}</strong>
                <span>studying now</span>
              </div>
              <button
                ref={guidelinesButtonRef}
                type="button"
                className="room-guidelines-trigger"
                onClick={() => setGuidelinesOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={guidelinesOpen}
              >
                <BookOpen size={15} aria-hidden="true" /> Room guidelines
              </button>
            </div>
          </div>

          {/* Soundscape Controls */}
          <div className="room-sound-container">
            <AmbientSound onSoundscapeChange={(s) => setSoundscape(s)} />
          </div>

          {/* Shared Focus Timer Panel */}
          <FocusTimerPanel
            minutes={room.minutes}
            formattedTime={formattedTime}
            active={active}
            onToggleActive={handleTimerToggle}
            onCompleteEarly={handleManualComplete}
            onReset={handleTimerReset}
            isCompleted={isCompleted}
            notifications={{
              enabled: timerAlerts.enabled,
              permission: timerAlerts.permission,
              onToggle: handleAlertsToggle,
            }}
          />
        </section>

        {/* Room Sidebar */}
        <StudyRoomSidebar
          room={room}
          joined={joined}
          notes={notes}
          noteInput={note}
          initialPeople={initialPeople}
          onToggleJoin={() => {
            const nextJoined = !joined;
            setJoined(nextJoined);
            triggerToast(nextJoined ? "You joined the table! 🍵" : "You stepped away.");
          }}
          onNoteInputChange={setNote}
          onAddNote={handleAddNote}
        />
      </div>

      <RoomGuidelines roomName={room.name} open={guidelinesOpen} onClose={closeGuidelines} />
    </main>
  );
}
