import type { StudyRoom } from "@/types/room";

export type RoomFilterGroup = "topics" | "moods" | "tags";

export type RoomFilters = Record<RoomFilterGroup, string[]>;

export const emptyRoomFilters: RoomFilters = { topics: [], moods: [], tags: [] };

export interface RoomFilterOption {
  value: string;
  count: number;
}

function countBy(values: string[]): RoomFilterOption[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value));
}

/** Filter options come from the rooms themselves, counted over the full list. */
export function getRoomFilterOptions(rooms: StudyRoom[]): Record<RoomFilterGroup, RoomFilterOption[]> {
  return {
    topics: countBy(rooms.map((room) => room.topic).filter(Boolean)),
    moods: countBy(rooms.map((room) => room.mood).filter(Boolean)),
    tags: countBy(rooms.flatMap((room) => room.tags ?? [])),
  };
}

export function countActiveFilters(filters: RoomFilters) {
  return filters.topics.length + filters.moods.length + filters.tags.length;
}

/**
 * Within a group a room matches if it has ANY selected value (OR).
 * Across groups a room must satisfy every group that has a selection (AND).
 */
export function filterRooms(rooms: StudyRoom[], filters: RoomFilters) {
  return rooms.filter(
    (room) =>
      (filters.topics.length === 0 || filters.topics.includes(room.topic)) &&
      (filters.moods.length === 0 || filters.moods.includes(room.mood)) &&
      (filters.tags.length === 0 || (room.tags ?? []).some((tag) => filters.tags.includes(tag)))
  );
}
