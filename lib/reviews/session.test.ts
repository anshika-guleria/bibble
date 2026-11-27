import { describe, it, expect } from "vitest";
import { ReviewSessionManager } from "./session";
import type { DueReviewItem } from "@/types/review";

function createMockDueItem(id: string, title: string): DueReviewItem {
  return {
    id,
    userId: "test-user",
    mapId: "map-1",
    nodeId: id,
    nodeTitle: title,
    mapTitle: "Computer Science",
    intervalDays: 1,
    easeFactor: 2.5,
    repetitions: 1,
    lastReviewedAt: "2026-01-01T00:00:00.000Z",
    nextReviewAt: "2026-01-02T00:00:00.000Z",
    lastRating: "good",
    algorithmVersion: "sm2-v1",
    history: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    isOverdue: true,
    overdueDays: 2,
  };
}

describe("ReviewSessionManager (Active Recall Session Lifecycle)", () => {
  it("initializes in idle state with queue items and starts on prompt state", () => {
    const items = [
      createMockDueItem("node-1", "Binary Search"),
      createMockDueItem("node-2", "Merge Sort"),
    ];
    const session = new ReviewSessionManager(items);

    expect(session.getState()).toBe("idle");
    expect(session.getCurrentItem()?.nodeTitle).toBe("Binary Search");

    session.start();
    expect(session.getState()).toBe("prompt");
    expect(session.getProgress()).toEqual({ current: 1, total: 2, pendingRequeue: 0 });
  });

  it("handles empty queue by finishing immediately", () => {
    const session = new ReviewSessionManager([]);
    expect(session.getState()).toBe("finished");
    expect(session.getCurrentItem()).toBeNull();

    session.start();
    expect(session.getState()).toBe("finished");
  });

  it("prevents grading before revealing the answer", () => {
    const items = [createMockDueItem("node-1", "Hash Maps")];
    const session = new ReviewSessionManager(items);
    session.start();

    expect(() => session.grade("good")).toThrow(
      'Cannot submit grade while in "prompt" state. Card must be revealed first.'
    );
  });

  it("advances through prompt -> revealed -> graded cleanly across cards", () => {
    const items = [
      createMockDueItem("node-1", "Dijkstra"),
      createMockDueItem("node-2", "A* Search"),
    ];
    const session = new ReviewSessionManager(items);
    session.start();

    // Card 1
    expect(session.getState()).toBe("prompt");
    session.reveal();
    expect(session.getState()).toBe("revealed");

    const step1 = session.grade("good");
    expect(step1.isSessionFinished).toBe(false);
    expect(step1.nextItem?.nodeTitle).toBe("A* Search");
    expect(session.getState()).toBe("prompt");

    // Card 2
    session.reveal();
    const step2 = session.grade("easy");
    expect(step2.isSessionFinished).toBe(true);
    expect(session.getState()).toBe("finished");

    const analytics = session.getAnalytics();
    expect(analytics.totalReviewed).toBe(2);
    expect(analytics.retentionRate).toBe(100);
    expect(analytics.ratingDistribution.good).toBe(1);
    expect(analytics.ratingDistribution.easy).toBe(1);
    expect(analytics.cardsRequeuedCount).toBe(0);
  });

  it("re-queues failed cards ('again') for in-session reinforcement until mastered", () => {
    const items = [
      createMockDueItem("node-1", "Dynamic Programming"),
      createMockDueItem("node-2", "Graph Traversal"),
    ];
    const session = new ReviewSessionManager(items);
    session.start();

    // Card 1: failed (Again)
    session.reveal();
    session.grade("again");
    expect(session.getProgress().pendingRequeue).toBe(1);

    // Card 2: passed (Good)
    session.reveal();
    session.grade("good");

    // Card 1 must be re-queued now!
    expect(session.getState()).toBe("prompt");
    expect(session.getCurrentItem()?.nodeTitle).toBe("Dynamic Programming");
    expect(session.getProgress().total).toBe(1); // Queue was reset to the 1 failed card

    // Re-test Card 1: passed (Hard)
    session.reveal();
    const finalStep = session.grade("hard");
    expect(finalStep.isSessionFinished).toBe(true);
    expect(session.getState()).toBe("finished");

    const analytics = session.getAnalytics();
    expect(analytics.totalReviewed).toBe(2); // 2 unique cards reviewed
    expect(analytics.totalSteps).toBe(3); // 3 total grading steps
    expect(analytics.cardsRequeuedCount).toBe(1);
    // Retention rate is 50% because 1 of 2 cards failed on first attempt
    expect(analytics.retentionRate).toBe(50.0);
    expect(analytics.ratingDistribution.again).toBe(1);
    expect(analytics.ratingDistribution.good).toBe(1);
    expect(analytics.ratingDistribution.hard).toBe(1);
  });
});
