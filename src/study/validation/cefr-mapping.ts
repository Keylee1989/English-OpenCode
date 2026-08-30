/**
 * Phase 22 (P0-3) — CEFR mapping layer.
 *
 * Centralizes the honesty contract: every CEFR-aligned value this app surfaces
 * is an "English360 internal estimate", NOT official CEFR certification. This
 * module stamps every derived level with its SOURCE (how it was measured),
 * an evidence-bound CONFIDENCE, and a human caveat, so no downstream view can
 * silently lose that context.
 *
 * Sources, ordered by epistemic strength (objective > algorithmic > AI-grade >
 * self-report):
 *   - "objective-test" : auto-graded receptive items (choice / recall / dictation)
 *   - "algorithm"       : Elo-style estimator over graded trials
 *   - "ai-grade"        : open productive item graded by an external LLM
 *   - "self-report"     : learner's own judgement (weakest; never equated to a test)
 *
 * Pure + deterministic + additive (no data/persistence changes).
 */
import type { AbilityEstimate } from "@/study/validation/adaptive";
import { CEFR_LEVELS, type CefrLevel } from "@/study/validation/adaptive";

export type CefrSource = "objective-test" | "algorithm" | "ai-grade" | "self-report";

export interface DerivedCefrLevel {
  level: CefrLevel;
  /** 0..1 how much evidence backs this estimate. */
  confidence: number;
  source: CefrSource;
  /** Number of graded trials behind the estimate. */
  evidenceCount: number;
  /** Human honesty caveat. */
  caveatZh: string;
  /** Never an official certification. */
  internalEstimate: true;
}

export const CEFR_ORDER: Record<CefrLevel, number> = {
  A1: 0, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5,
};

export const SOURCE_CONFIDENCE: Record<CefrSource, number> = {
  "objective-test": 0.9,
  algorithm: 0.75,
  "ai-grade": 0.6,
  "self-report": 0.3,
};

export const SOURCE_CAVEAT_ZH: Record<CefrSource, string> = {
  "objective-test": "由客观题自动判分得出（English360 内部估算，非官方 CEFR 认证）。",
  algorithm: "由测试算法估算得出（English360 内部估算，非官方 CEFR 认证）。",
  "ai-grade": "开放题由 AI 判分（English360 内部估算，非官方 CEFR 认证）。",
  "self-report": "由学习者自评得出（内部估算，非客观测试，非官方 CEFR 认证）。",
};

/** Base, source-independent honesty line. */
export const INTERNAL_ESTIMATE_NOTE = "English360 内部估算（非官方 CEFR 认证）。";

/** Wrap an AbilityEstimate into a DerivedCefrLevel with explicit marked source. */
export function internalCefrOf(
  est: AbilityEstimate,
  source: CefrSource = "algorithm",
): DerivedCefrLevel {
  const confidence =
    est.confidence > 0 ? (est.confidence + SOURCE_CONFIDENCE[source]) / 2 : SOURCE_CONFIDENCE[source] / 2;
  return {
    level: est.level,
    confidence: Math.round(Math.min(0.95, Math.max(0.05, confidence)) * 1000) / 1000,
    source,
    evidenceCount: est.trials,
    caveatZh: SOURCE_CAVEAT_ZH[source],
    internalEstimate: true,
  };
}

/** Map a 0..100 score to a DerivedCefrLevel using the Elo rating boundaries. */
export function internalCefrFromScore(
  score: number,
  opts: { confidence?: number; source?: CefrSource; evidenceCount?: number } = {},
): DerivedCefrLevel {
  const mappedRating = 700 + (Math.max(0, Math.min(100, score)) / 100) * 1200;
  const level = cefrFromRating(mappedRating);
  const source = opts.source ?? "algorithm";
  return {
    level,
    confidence: opts.confidence ?? SOURCE_CONFIDENCE[source],
    source,
    evidenceCount: opts.evidenceCount ?? 0,
    caveatZh: SOURCE_CAVEAT_ZH[source],
    internalEstimate: true,
  };
}

// Reuse the adaptive thresholds (kept in sync with cefrForElo).
const LEVEL_ELO: Record<CefrLevel, number> = { A1: 800, A2: 1000, B1: 1200, B2: 1400, C1: 1600, C2: 1800 };
const THRESHOLDS: Array<{ level: CefrLevel; at: number }> = (() => {
  const out: Array<{ level: CefrLevel; at: number }> = [];
  for (let i = 0; i < CEFR_LEVELS.length - 1; i++) {
    out.push({
      level: CEFR_LEVELS[i + 1],
      at: (LEVEL_ELO[CEFR_LEVELS[i]] + LEVEL_ELO[CEFR_LEVELS[i + 1]]) / 2,
    });
  }
  return out;
})();

function cefrFromRating(rating: number): CefrLevel {
  let level: CefrLevel = "A1";
  for (const t of THRESHOLDS) {
    if (rating >= t.at) level = t.level;
    else break;
  }
  return level;
}

/** Merge (weight-averaged) the strongest available sources into one estimate. */
export function mergeCefrSources(
  estimates: readonly DerivedCefrLevel[],
): DerivedCefrLevel {
  if (estimates.length === 0) {
    return {
      level: "A1",
      confidence: 0.05,
      source: "self-report",
      evidenceCount: 0,
      caveatZh: SOURCE_CAVEAT_ZH["self-report"],
      internalEstimate: true,
    };
  }
  // Weight by source strength and evidence count.
  const weighted: Array<{ level: CefrLevel; w: number; conf: number; ev: number; source: CefrSource }> = [];
  for (const e of estimates) {
    const w = SOURCE_CONFIDENCE[e.source] * (1 + Math.log1p(e.evidenceCount || 0));
    weighted.push({ level: e.level, w, conf: e.confidence, ev: e.evidenceCount, source: e.source });
  }
  const totalW = weighted.reduce((a, b) => a + b.w, 0) || 1;
  let ratingPos = 0;
  let confidence = 0;
  let evidenceCount = 0;
  for (const e of weighted) {
    ratingPos += (CEFR_ORDER[e.level] + 0.5) * (e.w / totalW);
    confidence += e.conf * (e.w / totalW);
    evidenceCount += e.ev;
  }
  // 0.5 = mid-band ordinal (A1 band occupies [0,1)); clamp within range.
  const pos = Math.max(0.25, Math.min(CEFR_LEVELS.length - 0.75, ratingPos));
  const level = CEFR_LEVELS[Math.round(pos - 0.5)] ?? "A1";
  const strongest = weighted.sort((a, b) => SOURCE_CONFIDENCE[b.source] - SOURCE_CONFIDENCE[a.source])[0].source;
  return {
    level,
    confidence: Math.round(Math.min(0.95, confidence) * 1000) / 1000,
    source: strongest,
    evidenceCount,
    caveatZh: SOURCE_CAVEAT_ZH[strongest],
    internalEstimate: true,
  };
}
