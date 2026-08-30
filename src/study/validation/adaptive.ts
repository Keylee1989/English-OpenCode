/**
 * Adaptive difficulty estimator for the Learning Validation / Baseline system.
 *
 * We estimate a learner's ability on a 0..continuous scale using the classic
 * Elo rating update (two-parameter logistic, K-factor), driven by probe items
 * whose intrinsic difficulty is mapped to a CEFR band. Ability is then mapped
 * to a CEFR-aligned level and a 0..100 score with an honest, evidence-bound
 * confidence (never represented as official certification).
 *
 * This is a lightweight, deterministic psychometric model — deliberately NOT a
 * claim of calibrated IRT. It is a documented heuristic that (a) is cheap to
 * run locally and offline, (b) converges toward a learner's ability boundary
 * with few items, and (c) is fully testable.
 */

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export function isCefrLevel(x: unknown): x is CefrLevel {
  return CEFR_LEVELS.includes(x as CefrLevel);
}

/** Ordered Elo center for each CEFR band (documented mapping, not a floor). */
const LEVEL_ELO: Record<CefrLevel, number> = {
  A1: 800,
  A2: 1000,
  B1: 1200,
  B2: 1400,
  C1: 1600,
  C2: 1800,
};

/** Each band becomes the active level once the rating crosses its midpoint. */
const THRESHOLDS: Array<{ level: CefrLevel; at: number }> = (() => {
  const out: Array<{ level: CefrLevel; at: number }> = [];
  for (let i = 0; i < CEFR_LEVELS.length - 1; i++) {
    out.push({ level: CEFR_LEVELS[i + 1], at: (LEVEL_ELO[CEFR_LEVELS[i]] + LEVEL_ELO[CEFR_LEVELS[i + 1]]) / 2 });
  }
  return out;
})();

export function eloForCefr(level: CefrLevel): number {
  return LEVEL_ELO[level];
}

export function cefrForElo(rating: number): CefrLevel {
  // Highest boundary the rating has crossed, else A1.
  let level: CefrLevel = "A1";
  for (const t of THRESHOLDS) {
    if (rating >= t.at) level = t.level;
    else break;
  }
  return level;
}

/** Logistic expected score for rating `a` against opponent `b`. */
export function eloExpected(a: number, b: number): number {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

/** One Elo update after a single trial. */
export function updateRating(rating: number, opponent: number, correct: boolean, k = 48): number {
  const p = eloExpected(rating, opponent);
  return rating + k * ((correct ? 1 : 0) - p);
}

/** Default prior ability (BDM/B1 boundary). */
export const PRIOR_RATING = 1200;
export const DEFAULT_K = 48;

export interface Trial {
  /** Intrinsic difficulty band of the probe. */
  level: CefrLevel;
  correct: boolean;
  /** True when the probe required productive output (typing/speaking/writing). */
  productive?: boolean;
}

export interface AbilityEstimate {
  level: CefrLevel;
  rating: number;
  /** 0..100, derived from rating (reporting convenience, NOT percent correct). */
  score: number;
  /** 0..1 evidence-bound confidence (truthful: low for few/uncertain trials). */
  confidence: number;
  trials: number;
  correct: number;
}

export function estimateFromTrials(
  trials: readonly Trial[],
  prior = PRIOR_RATING,
  k = DEFAULT_K,
): AbilityEstimate {
  if (trials.length === 0) {
    return { level: "A1", rating: prior, score: scoreFromRating(prior), confidence: 0.05, trials: 0, correct: 0 };
  }
  let r = prior;
  let correct = 0;
  for (const t of trials) {
    r = updateRating(r, eloForCefr(t.level), t.correct, k);
    if (t.correct) correct++;
  }
  const n = trials.length;
  const acc = correct / n;
  // Consistency: proximity of empirical accuracy to the boundary expectation.
  const consistency = 1 - Math.abs(acc - 0.5 * Math.min(1, n / 4));
  const raw = Math.max(0.15, Math.min(0.9, 0.25 + 0.075 * n + 0.2 * consistency));
  const confidence = Math.round(raw * 1000) / 1000;
  return {
    level: cefrForElo(r),
    rating: Math.round(r),
    score: Math.round(scoreFromRating(r) * 10) / 10,
    confidence,
    trials: n,
    correct,
  };
}

export function scoreFromRating(rating: number): number {
  const min = 700;
  const max = 1900;
  return Math.min(100, Math.max(0, ((rating - min) / (max - min)) * 100));
}

/** Human-readable evidence summary (shown to the learner, honest about limits). */
export function estimateEvidenceTrials(trials: readonly Trial[]): { level: CefrLevel; correct: number; total: number }[] {
  const by = new Map<CefrLevel, { correct: number; total: number }>();
  for (const t of trials) {
    const e = by.get(t.level) ?? { correct: 0, total: 0 };
    e.total++;
    if (t.correct) e.correct++;
    by.set(t.level, e);
  }
  return [...by.entries()]
    .map(([level, v]) => ({ level, correct: v.correct, total: v.total }))
    .sort((a, b) => CEFR_LEVELS.indexOf(a.level) - CEFR_LEVELS.indexOf(b.level));
}
