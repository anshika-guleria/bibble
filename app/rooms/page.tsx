"use client";

import { RoomGuidelines } from "@/components/rooms/room-guidelines";
import { StudyRoomCard } from "@/components/rooms/study-room-card";
import { StudyRoomCardSkeleton } from "@/components/rooms/study-room-card-skeleton";
import { SiteHeader } from "@/components/site-header";
import { studyRooms } from "@/data/study-rooms";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { CUSTOM_ROOMS_KEY } from "@/lib/rooms/custom-rooms";
import type { StudyRoom } from "@/types/room";
import { Plus, Search, Star, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";

// Number of placeholder cards shown while the room list is loading.
const SKELETON_COUNT = 4;

const subscribe = () => () => {};

// False on the server and during hydration, true once the client has taken over.
function useClientReady() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

export default function RoomsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const ready = useClientReady();
  const [customRooms] = useLocalStorage<StudyRoom[]>(CUSTOM_ROOMS_KEY, []);
  const [pendingRoom, setPendingRoom] = useState<StudyRoom | null>(null);
  const entryTriggerRef = useRef<HTMLButtonElement>(null);

  const openGuidelines = useCallback((room: StudyRoom, trigger: HTMLButtonElement) => {
    entryTriggerRef.current = trigger;
    setPendingRoom(room);
  }, []);

  const closeGuidelines = useCallback(() => {
    setPendingRoom(null);
    entryTriggerRef.current?.focus();
  }, []);

  const confirmEntry = useCallback(() => {
    if (!pendingRoom) return;
    const roomId = pendingRoom.id;
    setPendingRoom(null);
    router.push(`/rooms/${roomId}`);
  }, [pendingRoom, router]);

  const rooms = useMemo(
    () =>
      [...studyRooms, ...customRooms].filter((room) =>
        `${room.name} ${room.topic} ${room.tags.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [query, customRooms]
  );

  return (
    <main className="rooms-page">
      <SiteHeader />
      <section className="rooms-intro">
        <div>
          <span className="eyebrow">
            <Star size={14} /> Study together, softly
          </span>
          <h1>
            Find your little<br />
            <em>study table.</em>
          </h1>
          <p>
            Drop into a cozy room, set a gentle focus timer, and let the quiet company carry you forward.
          </p>
        </div>
        <div className="rooms-counter">
          <Users size={18} />
          <strong>21</strong>
          <span>
            people learning<br />
            together right now
          </span>
        </div>
      </section>

      <div className="rooms-toolbar">
        <div className="room-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a topic or room"
            aria-label="Search study rooms"
          />
        </div>
        <div className="rooms-toolbar-actions">
          <span className="rooms-toolbar-note" aria-live="polite">
            {ready ? `${rooms.length} open rooms · no sign-up needed` : "Loading rooms…"}
          </span>
          <Link href="/rooms/new" className="button-primary">
            <Plus size={16} aria-hidden="true" /> Create a room
          </Link>
        </div>
      </div>

      <section className="room-grid" aria-busy={!ready} aria-label="Study rooms">
        {ready
          ? rooms.map((room) => <StudyRoomCard key={room.id} room={room} onEnter={openGuidelines} />)
          : Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <StudyRoomCardSkeleton key={index} />
            ))}
      </section>

      <section className="rooms-callout cozy-wallpaper-pattern">
        <div className="callout-spark">
          <Star size={22} />
        </div>
        <div>
          <span className="eyebrow">Make your own corner</span>
          <h2>Can&apos;t find the right room?</h2>
          <p>
            Start with a map and make a room around the thing you&apos;re learning today.
          </p>
        </div>
        <Link href="/create" className="button-primary">
          Create a map <Star size={16} />
        </Link>
      </section>

      {pendingRoom && (
        <RoomGuidelines
          roomName={pendingRoom.name}
          open
          onClose={closeGuidelines}
          onConfirm={confirmEntry}
        />
      )}
    </main>
  );
}
