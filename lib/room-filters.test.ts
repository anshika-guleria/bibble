import { describe, expect, it } from "vitest";

import { studyRooms } from "@/data/study-rooms";
import type { StudyRoom } from "@/types/room";

import { countActiveFilters, emptyRoomFilters, filterRooms, getRoomFilterOptions } from "./room-filters";

function room(overrides: Partial<StudyRoom>): StudyRoom {
  return {
    id: "r",
    name: "Room",
    topic: "Topic",
    description: "",
    mood: "cozy",
    color: "#fff",
    participants: 1,
    capacity: 5,
    minutes: 25,
    host: "Host",
    tags: [],
    ...overrides,
  };
}

const rooms: StudyRoom[] = [
  room({ id: "a", topic: "React", mood: "focus", tags: ["frontend", "pomodoro"] }),
  room({ id: "b", topic: "React", mood: "cozy", tags: ["frontend"] }),
  room({ id: "c", topic: "DSA", mood: "cozy", tags: ["quiet music", "beginner friendly"] }),
  room({ id: "d", topic: "DevOps", mood: "sprint", tags: [] }),
];

const ids = (list: StudyRoom[]) => list.map((r) => r.id);

describe("getRoomFilterOptions", () => {
  it("builds options only from values that exist, with counts over the full list", () => {
    const options = getRoomFilterOptions(rooms);
    expect(options.topics).toEqual([
      { value: "DevOps", count: 1 },
      { value: "DSA", count: 1 },
      { value: "React", count: 2 },
    ]);
    expect(options.moods).toEqual([
      { value: "cozy", count: 2 },
      { value: "focus", count: 1 },
      { value: "sprint", count: 1 },
    ]);
    expect(options.tags.find((t) => t.value === "frontend")).toEqual({ value: "frontend", count: 2 });
  });

  it("is sorted so the order does not change between renders", () => {
    const values = getRoomFilterOptions(rooms).tags.map((t) => t.value);
    expect(values).toEqual([...values].sort((a, b) => a.localeCompare(b)));
  });

  it("copes with missing metadata", () => {
    const broken = [
      room({ id: "x", topic: "", tags: undefined as unknown as string[] }),
      room({ id: "y", mood: undefined as unknown as StudyRoom["mood"] }),
    ];
    const options = getRoomFilterOptions(broken);
    expect(options.topics.map((t) => t.value)).toEqual(["Topic"]);
    expect(options.tags).toEqual([]);
    expect(options.moods).toEqual([{ value: "cozy", count: 1 }]);
  });

  it("gives empty groups for an empty list", () => {
    expect(getRoomFilterOptions([])).toEqual({ topics: [], moods: [], tags: [] });
  });

  it("works on the real sample rooms", () => {
    const options = getRoomFilterOptions(studyRooms);
    expect(options.topics.length).toBeGreaterThan(0);
    expect(options.topics.reduce((sum, o) => sum + o.count, 0)).toBe(studyRooms.length);
  });
});

describe("filterRooms", () => {
  it("returns every room when nothing is selected", () => {
    expect(ids(filterRooms(rooms, emptyRoomFilters))).toEqual(["a", "b", "c", "d"]);
  });

  it("filters by a single topic, study style or tag", () => {
    expect(ids(filterRooms(rooms, { ...emptyRoomFilters, topics: ["React"] }))).toEqual(["a", "b"]);
    expect(ids(filterRooms(rooms, { ...emptyRoomFilters, moods: ["sprint"] }))).toEqual(["d"]);
    expect(ids(filterRooms(rooms, { ...emptyRoomFilters, tags: ["pomodoro"] }))).toEqual(["a"]);
  });

  it("matches ANY value selected inside one group (OR)", () => {
    expect(ids(filterRooms(rooms, { ...emptyRoomFilters, topics: ["DSA", "DevOps"] }))).toEqual(["c", "d"]);
    expect(ids(filterRooms(rooms, { ...emptyRoomFilters, tags: ["pomodoro", "quiet music"] }))).toEqual(["a", "c"]);
  });

  it("requires every group that has a selection (AND)", () => {
    expect(ids(filterRooms(rooms, { topics: ["React"], moods: ["cozy"], tags: [] }))).toEqual(["b"]);
    expect(ids(filterRooms(rooms, { topics: ["React"], moods: ["cozy"], tags: ["pomodoro"] }))).toEqual([]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterRooms(rooms, { ...emptyRoomFilters, topics: ["Rust"] })).toEqual([]);
  });

  it("skips rooms with missing tags instead of failing", () => {
    const list = [room({ id: "x", tags: undefined as unknown as string[] }), rooms[0]];
    expect(ids(filterRooms(list, { ...emptyRoomFilters, tags: ["frontend"] }))).toEqual(["a"]);
  });

  it("does not change the list it was given", () => {
    const copy = [...rooms];
    filterRooms(rooms, { ...emptyRoomFilters, topics: ["React"] });
    expect(rooms).toEqual(copy);
  });

  it("clearing the filters brings every room back", () => {
    const narrowed = filterRooms(rooms, { topics: ["React"], moods: ["focus"], tags: [] });
    expect(narrowed).toHaveLength(1);
    expect(ids(filterRooms(rooms, emptyRoomFilters))).toHaveLength(rooms.length);
  });
});

describe("countActiveFilters", () => {
  it("counts selections across all groups", () => {
    expect(countActiveFilters(emptyRoomFilters)).toBe(0);
    expect(countActiveFilters({ topics: ["a", "b"], moods: ["cozy"], tags: ["x"] })).toBe(4);
  });
});
