/**
 * Memory Engine + SRS Engine - v0 REAL implementation.
 *
 * Two-component model per item:
 *  - stability  : days until recall probability decays to ~10%
 *  - difficulty : intrinsic difficulty 0..1, raised by lapses
 *
 * Scheduling rules (deterministic, unit-tested):
 *  success: stability' = stability x (2.2 - 1.3*difficulty)   [factor > 1 always,
 *           clamped so growth is guaranteed even at max difficulty]
 *           first success from a fresh item -> stability = 1 day (review tomorrow)
 *  failure: stability' = max(10 minutes, stability x 0.25)
 *           difficulty' = min(0.95, difficulty + 0.12)
 *  dueAt = lastReview + stability days
 *
 * Stage ladder moves on evidence only; production modes move it faster.
 */
import { db, type MemoryStateRow } from "@/data/db";
import { MASTERY_STAGES, masteryRank } from "@/core/types";
import { findVocab } from "@/content";
import { isSpeechSupported } from "@/speech/tts";
import type { ReviewMode } from "@/engines/memory/memory-engine";

const MS_PER_DAY = 86_400_000;
const MIN_STABILITY_DAYS = 10 / (24 * 60); // ~10 minutes
const MAX_STABILITY_DAYS = 365;
const MAX_DIFFICULTY = 0.95;
const SUCCESS_FACTOR_BASE = 2.2;
const SUCCESS_FACTOR_SLOPE = 1.3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export async function introduceItem(
  itemId: string,
  baseDifficulty: number,
  nowMs: number = Date.now(),
): Promise<MemoryStateRow> {
  const existing = await db.memoryStates.get(itemId);
  if (existing) return existing;
  const row: MemoryStateRow = {
    itemId,
    stage: "unseen",
    stability: 0,
    difficulty: clamp(baseDifficulty || 0.3, 0.05, MAX_DIFFICULTY),
    dueAt: nowMs,
    lastReviewedAt: null,
    successfulReps: 0,
    lapses: 0,
    reviewCount: 0,
    successCount: 0,
    failureCount: 0,
    producedCount: 0,
  };
  await db.memoryStates.put(row);
  return row;
}

export interface ReviewInput {
  itemId: string;
  /** 0..1 graded outcome. >=0.6 counts as success. */
  grade: number;
  production?: boolean;
  nowMs?: number;
}

export async function applyReview(input: ReviewInput): Promise<MemoryStateRow> {
  const nowMs = input.nowMs ?? Date.now();
  let row = await db.memoryStates.get(input.itemId);
  if (!row) {
    row = await introduceItem(input.itemId, 0.35, nowMs);
  }

  const success = input.grade >= 0.6;

  if (success) {
    // Guaranteed-growth factor: at difficulty 0.95 -> ~1.21x, at 0.05 -> ~2.14x.
    const factor = SUCCESS_FACTOR_BASE + SUCCESS_FACTOR_SLOPE * (1 - row.difficulty);
    row.stability =
      row.stability <= 0 ? 1 : Math.min(MAX_STABILITY_DAYS, row.stability * factor);
    row.difficulty = clamp(row.difficulty - 0.06, 0.05, MAX_DIFFICULTY);
    row.successfulReps += 1;
    row.successCount += 1;
  } else {
    row.stability = Math.max(MIN_STABILITY_DAYS, row.stability * 0.25);
    row.difficulty = clamp(row.difficulty + 0.12, 0.05, MAX_DIFFICULTY);
    row.lapses += 1;
    row.failureCount += 1;
  }

  row.reviewCount += 1;
  row.lastReviewedAt = nowMs;
  row.dueAt = nowMs + row.stability * MS_PER_DAY;

  if (input.production && success) row.producedCount += 1;

  // Mastery stage movement (evidence-based, never cosmetic).
  if (row.stage === "unseen") {
    row.stage = success ? "recognized" : "unseen";
  } else {
    const rank = masteryRank(row.stage as (typeof MASTERY_STAGES)[number]);
    const nextRank = success
      ? Math.min(masteryRank("mastered"), rank + (input.production ? 2 : 1))
      : Math.max(0, rank - 1);
    row.stage = MASTERY_STAGES[nextRank];
  }

  await db.memoryStates.put(row);
  return row;
}

/** Exponential forgetting curve: p = exp(-elapsed / stability). */
export async function predictRecall(itemId: string, atTime: number): Promise<number> {
  const row = await db.memoryStates.get(itemId);
  if (!row || row.lastReviewedAt === null) return 0;
  if (row.stability <= 0) return 0;
  const elapsedDays = Math.max(0, atTime - row.lastReviewedAt) / MS_PER_DAY;
  return Math.exp(-elapsedDays / row.stability);
}

export interface DueCardView {
  state: MemoryStateRow;
  vocabTitleEn: string | null;
  suggestedModes: ReviewMode[];
}

/**
 * Due queue ordered by oldest due first. Suggested review modes adapt:
 * - lapsed/hard items drop back to recognition (easier retrieval path)
 * - strong items get production modes (typing/building sentences)
 * - listening modes require real audio support
 */
export async function getDueCards(
  nowMs: number = Date.now(),
  limit = 50,
  options: { speechAvailable?: boolean } = {},
): Promise<DueCardView[]> {
  const speech = options.speechAvailable ?? isSpeechSupported();
  const rows = await db.memoryStates.where("dueAt").belowOrEqual(nowMs).sortBy("dueAt");
  return rows.slice(0, limit).map((state) => {
    const vocab = findVocab(state.itemId);
    const modes: ReviewMode[] = [];
    const hard = state.lapses >= 2 || state.difficulty >= 0.75;
    const early = state.stage === "unseen" || state.stage === "seen" || state.stage === "recognized";
    if (hard) {
      modes.push("recognition");
      if (!early) modes.push("active-recall");
    } else if (early) {
      modes.push("recognition", "active-recall");
    } else {
      modes.push("active-recall", "sentence-production");
      if (speech) modes.push("listening-recall");
    }
    const filtered = speech ? modes : modes.filter((m) => m !== "listening-recall");
    return {
      state,
      vocabTitleEn: vocab?.word ?? null,
      suggestedModes: filtered.length > 0 ? filtered : ["recognition"],
    };
  });
}
