"use client";

import { BibbleError } from "@/components/error/bibble-error";
import { StudyRoomShell } from "@/components/rooms/study-room-shell";
import { SiteHeader } from "@/components/site-header";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { CUSTOM_ROOMS_KEY } from "@/lib/rooms/custom-rooms";
import type { StudyRoom } from "@/types/room";

// Rooms made with the create-room form only exist in this browser, so they
// have to be looked up on the client.
export function CustomRoomPage({ id }: { id: string }) {
  const [customRooms, , hydrated] = useLocalStorage<StudyRoom[]>(CUSTOM_ROOMS_KEY, []);
  const room = customRooms.find((customRoom) => customRoom.id === id);

  if (room) return <StudyRoomShell room={room} />;
  if (!hydrated) return null;

  return (
    <div className="not-found-page">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="not-found-main">
        <BibbleError type="not-found" />
      </main>
    </div>
  );
}
