import { describe, expect, it } from "vitest";

import { isRoomFull, seatsLeft } from "./room-capacity";

describe("room capacity", () => {
  it("is not full while seats remain", () => {
    expect(isRoomFull({ participants: 4, capacity: 8 })).toBe(false);
    expect(isRoomFull({ participants: 7, capacity: 8 })).toBe(false);
    expect(seatsLeft({ participants: 7, capacity: 8 })).toBe(1);
  });

  it("is full when participants reach capacity", () => {
    expect(isRoomFull({ participants: 8, capacity: 8 })).toBe(true);
    expect(seatsLeft({ participants: 8, capacity: 8 })).toBe(0);
  });

  it("treats an over-capacity room as full with no negative seats", () => {
    expect(isRoomFull({ participants: 9, capacity: 8 })).toBe(true);
    expect(seatsLeft({ participants: 9, capacity: 8 })).toBe(0);
  });
});