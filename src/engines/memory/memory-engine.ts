/**
 * Memory Engine + SRS Engine.
 *
 * Memory Engine: two-component memory model (stability x difficulty) per
 * knowledge item; predicts recall probability; chooses the best memory
 * method per item (active recall, context production, mnemonics, roots...)
 * based on error type and history - never applies every method to every word
 * (spec §11).
 *
 * SRS Engine: schedules due reviews from Memory State. Supports mixed review
 * modes (flashcard, recognition, listening recall, sentence production...),
 * error review, weak-point review.
 *
 * PHASE 0: interfaces only - no implementation, no fake scheduling math.
 */
import type { KnowledgeItem } from "@/core/types";
import type { MemoryState } from "@/core/types";

export type ReviewMode =
  | "flashcard"
  | "recognition"
  | "active-recall"
  | "listening-recall"
  | "speaking-recall"
  | "sentence-production"
  | "contextual-recall";

export interface DueCard {
  item: KnowledgeItem;
  state: MemoryState;
  suggestedModes: ReviewMode[];
}

export interface IMemoryEngine {
  getState(itemId: string): Promise<MemoryState | null>;
  /** Update stability/difficulty after a graded review. grade in [0..1]. */
  applyReview(itemId: string, grade: number, reviewedAt: number): Promise<MemoryState>;
  /** Predict probability of successful recall at a future time. */
  predictRecall(itemId: string, atTime: number): Promise<number>;
}

export interface ISrsEngine {
  getDueCards(nowMs: number, limit: number): Promise<DueCard[]>;
  scheduleNewItems(itemIds: string[]): Promise<void>;
}
