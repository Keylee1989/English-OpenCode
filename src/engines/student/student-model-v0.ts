/**
 * Student Model v0 - REAL implementation.
 *
 * Ability per skill is a continuous 0..100 estimate with confidence,
 * updated ONLY from recorded learning events (never hand-set).
 *
 * Update rule (deterministic, unit-tested):
 *   value(event) = correct ? 50 + 50*difficulty : 50 - 50*(1-difficulty)
 *     -> answering correctly on HARD material moves the score up more;
 *        failing EASY material pulls it down more.
 *   k = weight*K / (K + evidenceCount), K=8
 *   score' = score + k * (value*100 - score)      (exponential moving average)
 *   confidence' = min(0.95, n/(n+12))
 *
 * Evidence weights by interaction type: production > recall > recognition >
 * passive exposure. Self-reported events are down-weighted x0.5 and flagged.
 */
import { db, type AbilityRow } from "@/data/db";
import type { LearningEvent, SkillKey } from "@/core/types";

const K = 8;

export const EVIDENCE_WEIGHTS: Partial<Record<string, number>> = {
  "learn-new": 0.2,
  flashcard: 0.3,
  tap: 0.5,
  "multiple-choice": 0.6,
  typing: 1.0,
  "fill-blank": 1.0,
  recall: 1.2,
  listening: 1.1,
  dictation: 1.3,
  "sentence-ordering": 1.2,
  writing: 1.5,
  speaking: 0.9,
  pronunciation: 0.9,
  "self-assess": 0.8,
  "reading-comprehension": 1.1,
  "free-response": 1.4,
};

const PRODUCTIVE_SKILLS = new Set<SkillKey>(["speaking", "writing"]);
const RECEPTIVE_SKILLS = new Set<SkillKey>(["listening", "reading"]);

export const SKILL_LABEL_ZH: Record<string, string> = {
  vocabulary: "词汇",
  grammar: "语法",
  phonics: "自然拼读",
  pronunciation: "发音",
  listening: "听力",
  speaking: "口语",
  reading: "阅读",
  writing: "写作",
};

function defaultAbility(skill: SkillKey): AbilityRow {
  return {
    skill,
    score: 0,
    confidence: 0,
    evidenceCount: 0,
    lastUpdated: Date.now(),
    trend: "flat",
  };
}

/** Outcome mapped to 0..100 with difficulty credit. */
export function eventValue01(correct: boolean | null, difficulty?: number): number {
  const diff = Math.min(1, Math.max(0, difficulty ?? 0.5));
  if (correct === null) return 0.5;
  return correct ? 0.5 + 0.5 * diff : 0.5 - 0.5 * (1 - diff);
}

async function computeTrend(skill: SkillKey): Promise<"up" | "flat" | "down"> {
  // Last 20 events for this skill; compare recent half vs older half.
  const recent = await db.learningEvents
    .where("skill")
    .equals(skill)
    .reverse()
    .sortBy("occurredAt")
    .then((rows) => rows.slice(0, 20));
  if (recent.length < 6) return "flat";
  const values = recent.map((row) => {
    const correctValue = row.correct === null ? 0.5 : row.correct ? 1 : 0;
    const diff = row.difficulty ?? 0.5;
    return row.correct === null ? 0.5 : correctValue === 1 ? 0.5 + 0.5 * diff : 0.5 - 0.5 * (1 - diff);
  });
  const half = Math.floor(values.length / 2);
  const recentAvg = values.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const olderAvg = values.slice(half).reduce((a, b) => a + b, 0) / (values.length - half);
  const delta = (recentAvg - olderAvg) * 100;
  if (delta >= 8) return "up";
  if (delta <= -8) return "down";
  return "flat";
}

/** Feed one observed event; persists the updated ability snapshot. */
export async function observe(event: LearningEvent & { selfReported?: boolean }): Promise<AbilityRow> {
  const existing = (await db.abilities.get(event.skill)) ?? defaultAbility(event.skill);

  let weight = event.meta?.["evidenceWeight"] as number | undefined;
  if (weight === undefined) weight = EVIDENCE_WEIGHTS[event.interaction] ?? 0.8;
  if (event.selfReported || event.meta?.["selfReported"]) weight *= 0.5;

  const value = eventValue01(event.correct, event.difficulty);
  const k = (weight * K) / (K + existing.evidenceCount);
  const nextScore = existing.score + k * (value * 100 - existing.score);
  const nextCount = existing.evidenceCount + 1;

  const row: AbilityRow = {
    skill: event.skill,
    score: Math.min(100, Math.max(0, nextScore)),
    confidence: Math.min(0.95, nextCount / (nextCount + 12)),
    evidenceCount: nextCount,
    lastUpdated: Date.now(),
    trend: await computeTrend(event.skill),
  };
  await db.abilities.put(row);
  return row;
}

export async function getAbility(skill: SkillKey): Promise<AbilityRow> {
  return (await db.abilities.get(skill)) ?? defaultAbility(skill);
}

export async function getAllAbilities(): Promise<Record<string, AbilityRow>> {
  const rows = await db.abilities.toArray();
  const map: Record<string, AbilityRow> = {};
  for (const row of rows) map[row.skill] = row;
  return map;
}

export async function getProductiveAbility(): Promise<Partial<Record<SkillKey, AbilityRow>>> {
  const all = await getAllAbilities();
  const out: Partial<Record<SkillKey, AbilityRow>> = {};
  for (const skill of PRODUCTIVE_SKILLS) if (all[skill]) out[skill] = all[skill];
  return out;
}

export async function getReceptiveAbility(): Promise<Partial<Record<SkillKey, AbilityRow>>> {
  const all = await getAllAbilities();
  const out: Partial<Record<SkillKey, AbilityRow>> = {};
  for (const skill of RECEPTIVE_SKILLS) if (all[skill]) out[skill] = all[skill];
  return out;
}

export async function getItemMastery(itemId: string): Promise<string> {
  const row = await db.memoryStates.get(itemId);
  return row?.stage ?? "unseen";
}

export async function getFatigueIndicators(): Promise<{ recentErrorRate: number; avgLatencyTrendMs: number }> {
  const ordered = await db.learningEvents.orderBy("occurredAt").toArray();
  const recent = ordered.slice(-15);
  const graded = recent.filter((row) => row.correct !== null);
  const errorRate =
    graded.length === 0 ? 0 : graded.filter((row) => row.correct === false).length / graded.length;
  const latencies = recent.map((row) => row.latencyMs ?? 0).filter((v) => v > 0);
  const firstHalf = latencies.slice(0, Math.floor(latencies.length / 2));
  const secondHalf = latencies.slice(Math.floor(latencies.length / 2));
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  return { recentErrorRate: errorRate, avgLatencyTrendMs: avg(firstHalf) - avg(secondHalf) };
}

/** Recent accuracy for one skill over its last N graded events (planner input). */
export async function recentAccuracy(skill: SkillKey, n = 10): Promise<number | null> {
  const rows = await db.learningEvents
    .where("skill")
    .equals(skill)
    .reverse()
    .sortBy("occurredAt")
    .then((list) => list.slice(0, n).filter((row) => row.correct !== null));
  if (rows.length === 0) return null;
  return rows.filter((row) => row.correct === true).length / rows.length;
}
