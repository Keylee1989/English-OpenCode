/**
 * Baseline model for the Adaptive Learning Validation / Baseline System.
 *
 * Stores a per-learner, per-skill adaptive estimate (overall + each of the
 * core skills) plus the evidence trail and an HONEST confidence + limitations
 * disclosure. This is a CEFR-ALIGNED ESTIMATE, never an official certification.
 *
 * Persistence rides the existing `settings` key-value table (SCHEMA_VERSION
 * frozen at 7) so baselines travel with normal data export/import. History is
 * kept so the learner can compare delta across Day 30/60/90/180/360.
 */
import type { AbilityEstimate, CefrLevel } from "@/study/validation/adaptive";
import type { SkillKey } from "@/core/types";

/** Version of the baseline algorithm/format. Bump when semantics change. */
export const BASELINE_VERSION = 1;

export const BASELINE_SKILLS: SkillKey[] = [
  "vocabulary",
  "grammar",
  "reading",
  "listening",
  "speaking",
  "writing",
];

export interface SkillBaseline {
  skill: SkillKey;
  estimate: AbilityEstimate;
  /** Trials in this skill (probes presented). */
  tested: number;
}

export interface BaselineResult {
  version: number;
  timestamp: number;
  /** Overall CEFR-aligned estimate across skills. */
  overall: AbilityEstimate;
  /** Per-skill estimates. */
  skills: Record<SkillKey, AbilityEstimate>;
  /** Probe ids actually tested (evidence trail). */
  testedItems: string[];
  /** Aggregate probe counts. */
  stats: { probes: number; correct: number };
  /** Human-readable limitations of this estimate. */
  limitations: string[];
  /**
   * Phase 22 (P0-6) — longitudinal metadata. ALL OPTIONAL / ADD-ONLY so
   * baselines persisted under SCHEMA_VERSION 7 remain fully valid.
   */
  /** Number of skill dimensions exercised (0..6). */
  testedSkills?: number;
  /** Total question count presented. */
  questionCount?: number;
  /** Fraction of questions graded objectively (auto-checks, 0..1). */
  objectiveRatio?: number;
  /** Fraction graded by learner self-report only (0..1). */
  selfReportedRatio?: number;
  /** Explicit evidence count = testedItems.length. */
  evidenceCount?: number;
}

/** The first baseline (identity for later delta). */
export const BASELINE_SETTINGS_KEY = "adaptive-baseline";
/** The most recent result (the live estimate shown to the learner). */
export const LATEST_SETTINGS_KEY = "adaptive-latest";
/** Full run history (array), for Day 30/60/90/180/360 deltas. */
export const HISTORY_SETTINGS_KEY = "adaptive-history";

export interface BaselineCache {
  baseline: BaselineResult | null;
  latest: BaselineResult | null;
  history: BaselineResult[];
}

export function emptySkillRecord(): Record<SkillKey, AbilityEstimate> {
  const out = {} as Record<SkillKey, AbilityEstimate>;
  for (const s of BASELINE_SKILLS) out[s] = emptyEstimate();
  return out;
}

function emptyEstimate(): AbilityEstimate {
  return { level: "A1", rating: 1200, score: 0, confidence: 0, trials: 0, correct: 0 };
}

/** Combine per-skill estimates into one overall estimate (weighted by trials). */
export function overallFromSkills(
  skills: Record<SkillKey, AbilityEstimate>,
  version = BASELINE_VERSION,
  testedItems: string[] = [],
  stats?: { probes: number; correct: number },
  limitations: string[] = DEFAULT_LIMITATIONS,
): BaselineResult {
  const rated = BASELINE_SKILLS.filter((s) => skills[s].trials > 0);
  if (rated.length === 0) {
    return {
      version,
      timestamp: Date.now(),
      overall: emptyEstimate(),
      skills,
      testedItems,
      stats: { probes: 0, correct: 0 },
      limitations,
    };
  }
  const weight = rated.map((s) => Math.max(1, skills[s].trials));
  const totalW = weight.reduce((a, b) => a + b, 0);
  let rating = 0;
  let confidence = 0;
  let correct = 0;
  let probes = 0;
  for (let i = 0; i < rated.length; i++) {
    const s = rated[i];
    const w = weight[i];
    rating += (skills[s].rating * w) / totalW;
    confidence += (skills[s].confidence * w) / totalW;
    correct += skills[s].correct;
    probes += skills[s].trials;
  }
  rating = Math.round(rating);
  const level = levelFromRatingish(rating);
  return {
    version,
    timestamp: Date.now(),
    overall: {
      level,
      rating,
      score: Math.round((((rating - 700) / 1200) * 100) * 10) / 10,
      confidence: Math.round(confidence * 1000) / 1000,
      trials: probes,
      correct,
    },
    skills,
    testedItems,
    stats: stats ?? { probes, correct },
    limitations,
  };
}

/** Minimal level-from-rating used by the combination (kept in sync with adaptive). */
function levelFromRatingish(rating: number): CefrLevel {
  if (rating < 900) return "A1";
  if (rating < 1100) return "A2";
  if (rating < 1300) return "B1";
  if (rating < 1500) return "B2";
  if (rating < 1700) return "C1";
  return "C2";
}

export const DEFAULT_LIMITATIONS = [
  "本结果为英语测试算法给出的 CEFR 对齐估算（estimate），非官方 CEFR 认证。",
  "置信度随题目数量提升；题目少时结果仅供参考。",
  "口语/写作/听力开放式任务在未连接 AI 时由学习者自评，置信度相应降低。",
];

/** Signed CEFR-band delta between two baselines' overall (in bands, C2+A1=+5). */
export function cefrBandDelta(from: CefrLevel, to: CefrLevel): number {
  const order: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
  return order.indexOf(to) - order.indexOf(from);
}

/** Per-skill band delta map newest vs baseline overall/levels. */
export function bandDeltaFrom(latest: BaselineResult | null, baseline: BaselineResult | null): {
  overall: number | null;
  skills: Partial<Record<SkillKey, number>>;
} {
  const overall = baseline && latest ? cefrBandDelta(baseline.overall.level, latest.overall.level) : null;
  const skills: Partial<Record<SkillKey, number>> = {};
  if (baseline && latest) {
    for (const s of BASELINE_SKILLS) {
      skills[s] = cefrBandDelta(baseline.skills[s].level, latest.skills[s].level);
    }
  }
  return { overall, skills };
}

/**
 * Phase 22 (P0-6) — attach longitudinal metadata to a just-produced baseline,
 * ADD-ONLY (never required). `objectiveCount` = questions auto-graded (choice /
 * correction / dictation); the remainder is treated as learner self-report.
 */
export function withBaselineMetadata(
  result: BaselineResult,
  meta: { objectiveCount?: number; evidenceIds?: readonly string[] } = {},
): BaselineResult {
  const evidenceIds = meta.evidenceIds ?? result.testedItems;
  const probes = result.stats.probes;
  const objectiveCount = Math.min(probes, Math.max(0, meta.objectiveCount ?? 0));
  const testedSkills = BASELINE_SKILLS.filter((s) => result.skills[s].trials > 0).length;
  return {
    ...result,
    testedSkills,
    questionCount: probes,
    objectiveRatio: probes > 0 ? Math.round((objectiveCount / probes) * 1000) / 1000 : 0,
    selfReportedRatio: probes > 0 ? Math.round(((probes - objectiveCount) / probes) * 1000) / 1000 : 1,
    evidenceCount: evidenceIds.length,
  };
}

/** Phase 22 (P0-6) — one skill's longitudinal delta between two baselines. */
export interface SkillDelta {
  skill: SkillKey;
  fromLevel: CefrLevel;
  toLevel: CefrLevel;
  /** Signed band movement (+ up / - down / 0 no change). */
  bandDelta: number;
  /** Signed rating movement (Elastic-like score). */
  ratingDelta: number;
  /** Signed confidence movement (0..1 scale). */
  confidenceDelta: number;
  /** Evidence (questions) counted in the LATER estimate. */
  evidenceAfter: number;
  /** True when the LATER estimate is not objectively graded (self-report heavy). */
  selfReported: boolean;
}

/** Phase 22 (P0-6) — learner-facing "进步了多少" longitudinal comparison. */
export interface BaselineComparison {
  hasBaseline: boolean;
  hasLatest: boolean;
  /** Internal estimate reminder (never an official certification). */
  honestyZh: string;
  /** Signed overall band movement (baseline vs latest overall). */
  overallBandDelta: number | null;
  overallRatingDelta: number | null;
  overallConfidenceDelta: number | null;
  evidenceTotal: number;
  perSkill: SkillDelta[];
  /** Most-improved / most-regressed skill bands. */
  biggestGain: SkillKey | null;
  biggestLoss: SkillKey | null;
  /** README summary answer to "I've improved how much?" */
  summaryZh: string;
}

/** Compare an older baseline against the most recent result (additive, pure). */
export function compareBaselines(
  baseline: BaselineResult | null,
  latest: BaselineResult | null,
): BaselineComparison {
  const perSkill: SkillDelta[] = [];
  if (baseline && latest) {
    for (const s of BASELINE_SKILLS) {
      const b = baseline.skills[s];
      const l = latest.skills[s];
      perSkill.push({
        skill: s,
        fromLevel: b.level,
        toLevel: l.level,
        bandDelta: cefrBandDelta(b.level, l.level),
        ratingDelta: (l.rating ?? 0) - (b.rating ?? 0),
        confidenceDelta: Math.round(((l.confidence ?? 0) - (b.confidence ?? 0)) * 1000) / 1000,
        evidenceAfter: l.trials,
        selfReported: (l.trials ?? 0) === 0 || (l.confidence ?? 0) < 0.4,
      });
    }
  }

  const overallBandDelta =
    baseline?.overall && latest?.overall ? cefrBandDelta(baseline.overall.level, latest.overall.level) : null;
  const overallRatingDelta =
    baseline?.overall && latest?.overall ? (latest.overall.rating ?? 0) - (baseline.overall.rating ?? 0) : null;
  const overallConfidenceDelta =
    baseline?.overall && latest?.overall
      ? Math.round(((latest.overall.confidence ?? 0) - (baseline.overall.confidence ?? 0)) * 1000) / 1000
      : null;
  const evidenceTotal = latest?.testedItems?.length ?? 0;

  let biggestGain: SkillKey | null = null;
  let biggestLoss: SkillKey | null = null;
  let maxGain = -99;
  let maxLoss = 99;
  for (const d of perSkill) {
    if (d.bandDelta > maxGain) { maxGain = d.bandDelta; biggestGain = d.skill; }
    if (d.bandDelta < maxLoss) { maxLoss = d.bandDelta; biggestLoss = d.skill; }
  }

  let summaryZh: string;
  if (!baseline || !latest) {
    summaryZh = baseline && !latest
      ? "已完成首次基线评测，继续学习并在下一检查点复测即可看到进步对比。"
      : "尚未完成基线评测，无法给出进步对比。";
  } else if (overallBandDelta === null || overallRatingDelta === null) {
    summaryZh = "已有多轮基线数据，但整体评分缺失，无法汇总进步。";
  } else {
    const arrow = overallBandDelta > 0 ? "+" : overallBandDelta < 0 ? "−" : "=";
    const gain = biggestGain ? `，提升最多的是「${biggestGain}」` : "";
    const loss = biggestLoss && maxLoss < 0 ? `，需注意「${biggestLoss}」回落` : "";
    summaryZh =
      `整体 ${arrow}${Math.abs(overallBandDelta)} 档（${baseline.overall.level} → ${latest.overall.level}）` +
      `，评分 ${overallRatingDelta >= 0 ? "+" : ""}${overallRatingDelta}${gain}${loss}。` +
      `以上为 English360 内部估算（非官方 CEFR 认证），共 ${evidenceTotal} 条证据。`;
  }

  return {
    hasBaseline: baseline != null,
    hasLatest: latest != null,
    honestyZh: "以下进步对比为 English360 内部估算（非官方 CEFR 认证）。",
    overallBandDelta,
    overallRatingDelta,
    overallConfidenceDelta,
    evidenceTotal,
    perSkill,
    biggestGain,
    biggestLoss,
    summaryZh,
  };
}

// ---------------------------------------------------------------------------
// Persistence (settings key-value table, no schema bump)
// ---------------------------------------------------------------------------

export async function loadBaselineCache(): Promise<BaselineCache> {
  const baseline = (await read(BASELINE_SETTINGS_KEY)) as BaselineResult | null;
  const latest = (await read(LATEST_SETTINGS_KEY)) as BaselineResult | null;
  const history = (await read(HISTORY_SETTINGS_KEY)) as BaselineResult[] | undefined;
  return { baseline, latest, history: Array.isArray(history) ? history : [] };
}

async function read(key: string): Promise<unknown> {
  try {
    const row = await import("@/data/db").then((m) => m.db.settings.get(key));
    return row?.value;
  } catch {
    return undefined;
  }
}

/** Persist the baseline (first run), latest (this run), and history (deduped). */
export async function persistBaselineResult(result: BaselineResult): Promise<void> {
  const { db } = await import("@/data/db");
  const cache = await loadBaselineCache();
  const isFirst = !cache.baseline;
  const baseline = isFirst ? { ...result, timestamp: result.timestamp } : cache.baseline;
  const history = isFirst
    ? [result]
    : [
        ...cache.history.filter((r) => r.timestamp !== result.timestamp),
        result,
      ].sort((a, b) => a.timestamp - b.timestamp).slice(-48);
  await db.settings.put({ key: BASELINE_SETTINGS_KEY, value: baseline });
  await db.settings.put({ key: LATEST_SETTINGS_KEY, value: result });
  await db.settings.put({ key: HISTORY_SETTINGS_KEY, value: history });
}

export function baselinesEqual(a: BaselineResult | null, b: BaselineResult | null): boolean {
  if (!a || !b) return false;
  return a.timestamp === b.timestamp && a.overall.level === b.overall.level;
}
