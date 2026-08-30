/**
 * Phase 21 — Difficulty controller.
 *
 * Maps recent performance evidence onto the next CEFR difficulty band with an
 * explicit promotion / hold / remediation policy. Pure + deterministic.
 *
 * Guardrails (per spec):
 *  - no single correct event upgrades, no single error downgrades
 *  - difficulty only ever moves to an adjacent band (never a big jump)
 *  - sustained high performance promotes; sustained low performance remediates
 *  - a learner never stays stuck forever (promotion always possible) nor is
 *    punished endlessly (remediation caps at the floor band)
 */
import type { CefrLevel } from "@/study/validation/adaptive";

export const CEFR_ORDER: Record<CefrLevel, number> = {
  A1: 0, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5,
};

export const CEFR_LIST: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export type DifficultyDecision =
  | "too_easy"
  | "easy"
  | "appropriate"
  | "hard"
  | "too_hard";

export interface DifficultyOutcome {
  correct: boolean;
  selfReportedDifficulty?: "偏易" | "适中" | "偏难";
}

export interface DifficultyConfig {
  /** Minimum recent successes / outcomes in the window to trust a trend. */
  minWindow: number;
  /** Promotion requires >= this fraction of correct in the window. */
  promotionRatio: number;
  /** Remediation triggered when correct fraction <= this in the window. */
  remediationRatio: number;
  /** High-performer fast path: this many consecutive correct promotes. */
  promotionStreak: number;
  /** Allow motion only when window is full. */
  requireFullWindow: boolean;
}

export const DEFAULT_DIFFICULTY_CONFIG: DifficultyConfig = {
  minWindow: 4,
  promotionRatio: 0.85,
  remediationRatio: 0.35,
  promotionStreak: 4,
  requireFullWindow: false,
};

export interface DifficultyInput {
  /** Graded outcomes, most recent first. */
  recent: DifficultyOutcome[];
  /** Current CEFR band the learner is practicing at. */
  currentBand: CefrLevel;
  /** Confidence/self-assessment signal (0..1) when available (e.g. 1=very hard). */
  selfReportedHardness?: number;
  config?: Partial<DifficultyConfig>;
}

export interface DifficultyResult {
  /** Next band the learner should practice at. */
  nextBand: CefrLevel;
  decision: DifficultyDecision;
  /** Diagnostic detail for tests + UI. */
  reasonZh: string;
  window: number;
  correct: number;
}

export function difficultyForBand(band: CefrLevel): number {
  return (CEFR_ORDER[band] + 1) / CEFR_LIST.length; // 0.17..1
}

export function decideNextDifficulty(input: DifficultyInput): DifficultyResult {
  const cfg: DifficultyConfig = { ...DEFAULT_DIFFICULTY_CONFIG, ...(input.config ?? {}) };
  const currentIdx = CEFR_ORDER[input.currentBand];

  const windowN = Math.max(0, cfg.minWindow);
  const recent = input.recent.slice(0, Math.max(1, windowN));
  const n = recent.length;
  const correct = recent.filter((r) => r.correct).length;
  const ratio = n > 0 ? correct / n : 0;

  // Consecutive-current-streak at the tail (first elements are most recent).
  let streak = 0;
  for (const r of recent) {
    if (!r.correct) break;
    streak += 1;
  }

  let decision: DifficultyDecision;
  let nextIdx = currentIdx;

  if (streak >= cfg.promotionStreak) {
    decision = n <= 0 ? "appropriate" : "too_easy";
    nextIdx = Math.min(CEFR_LIST.length - 1, currentIdx + 1);
  } else if (n >= cfg.minWindow && ratio >= cfg.promotionRatio) {
    decision = "easy";
    nextIdx = Math.min(CEFR_LIST.length - 1, currentIdx + 1);
  } else if (n >= cfg.minWindow && ratio <= cfg.remediationRatio) {
    decision = "hard";
    nextIdx = Math.min(CEFR_LIST.length - 1, currentIdx - (currentIdx > 0 ? 1 : 0));
    if (currentIdx === 0) nextIdx = 0;
  } else {
    decision = "appropriate";
    nextIdx = currentIdx;
  }

  // Optional self-report override: if the learner says it's too hard, never
  // keep escalating; if they say too easy while scoring well, allow promotion.
  const sd = input.selfReportedHardness;
  if (typeof sd === "number") {
    if (sd >= 0.8 && nextIdx > 0) {
      decision = "too_hard";
      nextIdx = Math.min(CEFR_LIST.length - 1, currentIdx - 1);
    } else if (sd <= 0.2 && ratio >= cfg.promotionRatio && currentIdx < CEFR_LIST.length - 1) {
      decision = "easy";
      nextIdx = currentIdx + 1;
      streak = cfg.promotionStreak;
    }
  }

  // Adjacent-move guard (belt & braces): never jump more than one band.
  nextIdx = Math.max(0, Math.min(CEFR_LIST.length - 1, nextIdx));

  const nextBand = CEFR_LIST[nextIdx];
  const reasonZh =
    decision === "easy" || decision === "too_easy"
      ? `近 ${n} 题正确 ${correct} 次（${Math.round(ratio * 100)}%），熟练度高，提升到 ${nextBand}。`
      : decision === "hard" || decision === "too_hard"
        ? `近 ${n} 题正确 ${correct} 次（${Math.round(ratio * 100)}%），返回 ${nextBand} 强化。`
        : `近 ${n} 题水平适中（正确 ${correct} 次），维持在 ${nextBand}。`;

  return {
    nextBand,
    decision,
    reasonZh,
    window: n,
    correct,
  };
}
