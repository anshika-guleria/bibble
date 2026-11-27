import type { DueReviewItem, ReviewRating } from "@/types/review";

export type SessionState = "idle" | "prompt" | "revealed" | "finished";

export interface SessionGradingRecord {
  item: DueReviewItem;
  rating: ReviewRating;
  firstAttempt: boolean;
  timestamp: string;
}

export interface SessionAnalytics {
  totalReviewed: number;
  totalSteps: number;
  retentionRate: number; // 0 to 100 percentage of first-attempt success (rating !== 'again')
  ratingDistribution: Record<ReviewRating, number>;
  cardsRequeuedCount: number;
  isComplete: boolean;
}

/**
 * ReviewSessionManager governs the interactive Active Recall session lifecycle,
 * enforcing state transitions (prompt -> reveal -> grade), intra-session re-queueing of
 * failed cards ('again'), and real-time retention accuracy analytics.
 */
export class ReviewSessionManager {
  private queue: DueReviewItem[];
  private failedQueue: DueReviewItem[] = [];
  private completedRecords: SessionGradingRecord[] = [];
  private firstAttemptMap: Map<string, ReviewRating> = new Map();
  private currentIndex: number = 0;
  private state: SessionState = "idle";
  private requeuedCount: number = 0;

  constructor(items: DueReviewItem[]) {
    this.queue = Array.isArray(items) ? [...items] : [];
    if (this.queue.length > 0) {
      this.state = "idle";
    } else {
      this.state = "finished";
    }
  }

  /**
   * Current session state machine status.
   */
  public getState(): SessionState {
    return this.state;
  }

  /**
   * Current active card under review.
   */
  public getCurrentItem(): DueReviewItem | null {
    if (this.state === "finished" || this.currentIndex >= this.queue.length) {
      return null;
    }
    return this.queue[this.currentIndex];
  }

  /**
   * Current card progression: { current: 1-based, total: queue length }.
   */
  public getProgress(): { current: number; total: number; pendingRequeue: number } {
    return {
      current: Math.min(this.currentIndex + 1, this.queue.length),
      total: this.queue.length,
      pendingRequeue: this.failedQueue.length,
    };
  }

  /**
   * Starts or resumes the review session.
   */
  public start(): void {
    if (this.queue.length === 0) {
      this.state = "finished";
      return;
    }
    this.state = "prompt";
  }

  /**
   * Reveals the prompt's answer/notes.
   */
  public reveal(): void {
    if (this.state !== "prompt") return;
    this.state = "revealed";
  }

  /**
   * Submits a recall grade for the current card.
   * If rated 'again', the card is appended to the failedQueue for re-testing before session close.
   */
  public grade(rating: ReviewRating): { isSessionFinished: boolean; nextItem: DueReviewItem | null } {
    if (this.state !== "revealed") {
      throw new Error(`Cannot submit grade while in "${this.state}" state. Card must be revealed first.`);
    }

    const currentItem = this.getCurrentItem();
    if (!currentItem) {
      this.state = "finished";
      return { isSessionFinished: true, nextItem: null };
    }

    const isFirstAttempt = !this.firstAttemptMap.has(currentItem.id);
    if (isFirstAttempt) {
      this.firstAttemptMap.set(currentItem.id, rating);
    }

    this.completedRecords.push({
      item: currentItem,
      rating,
      firstAttempt: isFirstAttempt,
      timestamp: new Date().toISOString(),
    });

    if (rating === "again") {
      this.failedQueue.push(currentItem);
      this.requeuedCount++;
    }

    this.currentIndex++;

    // Check if the current queue pass is finished
    if (this.currentIndex >= this.queue.length) {
      if (this.failedQueue.length > 0) {
        // Loop back through failed cards for immediate reinforcement
        this.queue = [...this.failedQueue];
        this.failedQueue = [];
        this.currentIndex = 0;
        this.state = "prompt";
      } else {
        this.state = "finished";
      }
    } else {
      this.state = "prompt";
    }

    return {
      isSessionFinished: this.state === "finished",
      nextItem: this.getCurrentItem(),
    };
  }

  /**
   * Computes session retention statistics and rating distributions.
   */
  public getAnalytics(): SessionAnalytics {
    const distribution: Record<ReviewRating, number> = {
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
    };

    for (const record of this.completedRecords) {
      distribution[record.rating]++;
    }

    const firstAttempts = Array.from(this.firstAttemptMap.values());
    const totalFirstAttempts = firstAttempts.length;
    const successfulFirstAttempts = firstAttempts.filter((r) => r !== "again").length;

    const retentionRate =
      totalFirstAttempts > 0
        ? Math.round((successfulFirstAttempts / totalFirstAttempts) * 1000) / 10
        : 100.0;

    return {
      totalReviewed: totalFirstAttempts,
      totalSteps: this.completedRecords.length,
      retentionRate,
      ratingDistribution: distribution,
      cardsRequeuedCount: this.requeuedCount,
      isComplete: this.state === "finished",
    };
  }

  /**
   * Returns list of recorded review transitions.
   */
  public getHistory(): SessionGradingRecord[] {
    return [...this.completedRecords];
  }
}
