"use client";

import { isRoomFull, ROOM_FULL_MESSAGE } from "@/lib/room-capacity";
import type { StudyRoom } from "@/types/room";
import { Check, MessageCircle, Send, Sparkles, Users } from "lucide-react";

interface StudyRoomSidebarProps {
  room: StudyRoom;
  joined: boolean;
  notes: string[];
  noteInput: string;
  initialPeople: string[];
  onToggleJoin: () => void;
  onNoteInputChange: (val: string) => void;
  onAddNote: (e: React.FormEvent) => void;
}

export function StudyRoomSidebar({
  room,
  joined,
  notes,
  noteInput,
  initialPeople,
  onToggleJoin,
  onNoteInputChange,
  onAddNote,
}: StudyRoomSidebarProps) {
    // Someone already seated can always leave; only new joins are blocked.
    const blocked = isRoomFull(room) && !joined;
  return (
    <aside className="room-sidebar">
      <div className="room-side-section">
        <div className="room-side-title">
          <span>
            <Users size={15} /> Around the table
          </span>
          <span>{room.capacity} seats</span>
        </div>
        <div className="people-list">
          {initialPeople.slice(0, room.participants).map((person, index) => (
            <div className="person-row" key={person}>
              <span className={`person-avatar person-avatar-${index}`}>{person[0]}</span>
              <span>{person}</span>
              {index === 0 && <small className="badge-host">host</small>}
              {index === 1 && <Check size={14} className="check-icon" />}
            </div>
          ))}
          {joined && (
            <div className="person-row">
              <span className="person-avatar person-avatar-you">Y</span>
              <span>You</span>
              <small className="badge-you">here</small>
            </div>
          )}
        </div>
                {blocked && <p className="room-full-note" id="room-full-note">{ROOM_FULL_MESSAGE}</p>}
        <button
          className={`join-room-button ${joined ? "joined-room" : ""}`}
          onClick={onToggleJoin}
          disabled={blocked}
          aria-describedby={blocked ? "room-full-note" : undefined}
        >
          {joined ? (
            <>
              <Check size={16} /> You are in the room
            </>
          ) : blocked ? (
            <>
              <Users size={16} /> Room full
            </>
          ) : (
            <>
              <Users size={16} /> Take a seat
            </>
          )}
        </button>
      </div>

      <div className="room-side-section room-prompt">
        <div className="room-side-title">
          <span>
            <Sparkles size={15} /> Gentle prompt
          </span>
        </div>
        <p>What is one tiny thing you want to understand before you leave?</p>
      </div>

      <div className="room-side-section room-notes">
        <div className="room-side-title">
          <span>
            <MessageCircle size={15} /> Room notes
          </span>
        </div>
        <div className="room-note-list">
          {notes.map((item, index) => (
            <div className="room-note" key={`${index}-${item}`}>
              {item}
            </div>
          ))}
        </div>
        <p className="room-note-hint">Notes are saved in this browser only, so they stay after a refresh but are not shared.</p>
        <form className="room-note-form" onSubmit={onAddNote}>
          <input
            value={noteInput}
            onChange={(e) => onNoteInputChange(e.target.value)}
            placeholder="Leave a small note..."
            aria-label="Leave a room note"
          />
          <button aria-label="Send room note">
            <Send size={15} />
          </button>
        </form>
      </div>
    </aside>
  );
}
