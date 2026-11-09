import type { StudyRoom } from "@/types/room";

type RoomSeats = Pick<StudyRoom, "participants" | "capacity">;

/** True when every seat in the room is taken. */
export function isRoomFull(room: RoomSeats): boolean {
  return room.participants >= room.capacity;
}

/** Seats still open, never below zero. */
export function seatsLeft(room: RoomSeats): number {
  return Math.max(0, room.capacity - room.participants);
}

export const ROOM_FULL_MESSAGE = "No seats are available right now. Try another room or check back soon.";