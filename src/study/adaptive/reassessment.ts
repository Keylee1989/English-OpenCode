/**
 * Phase 21 — Reassessment loop.
 *
 * Connects Baseline -> Learning -> Checkpoint -> Reassessment -> Delta ->
 * Plan Adjustment. Supports micro / skill / full reassessment scopes and the
 * Day 1/7/30/60/90/180/360 checkpoint cadence WITHOUT forcing a full six-skill
 * pass every time.
 *
 * Pure + deterministic assessment of a delta; persistence and planning glue is
 * kept separate so this module is unit-testable.
 */
import { cefrBandDelta } from "@/study/validation/baseline-model";
import type { AbilityEstimate } from "@/study/validation/adaptive";
import type { SkillKey } from "@/core/types";

export type ReassessmentScope = "micro" | "skill" | "full";

export interface ReassessmentRecord {
  scope: ReassessmentScope;
  checkpointDay: number;
  timestamp: number;
  before: AbilityEstimate;
  after: AbilityEstimate;
  /** signed band delta (+ up, - down) */
  delta: number;
  confidence: number;
  itemCount: number;
  /** fraction of productive (open output) items in the sample 0..1 */
  productiveRatio: number;
  timeElapsedMs: number;
  skillsDelta: Partial<Record<SkillKey, number>>;
  noteZh: string;
}

export interface PlanAdjustment {
  /** 0..1 extra weight to pour into the most regressed skill. */
  boost: number;
  focusSkill: SkillKey | null;
  reasonZh: string;
}

export const CHECKPOINT_DAYS = [1, 7, 30, 60, 90, 180, 360] as const;

export function isCheckpointDay(day: number): boolean {
  return (CHECKPOINT_DAYS as readonly number[]).includes(day);
}

/**
 * Compute an objective-ish delta between two per-skill estimates. Because the
 * "before" sample and "after" sample may differ in size and in productive ratio,
 * the delta is honest: it reflects the CEFR band movement and is annotated with
 * sample size + productive ratio rather than pretending to be a single clean
 * number.
 */
export function computeDelta(params: {
  scope: ReassessmentScope;
  checkpointDay: number;
  timestamp: number;
  before: AbilityEstimate;
  after: AbilityEstimate;
  beforeTime: number;
  productiveCorrectBefore?: number;
  productiveCorrectAfter?: number;
  skillsDelta?: Partial<Record<SkillKey, number>>;
}): ReassessmentRecord {
  const delta = cefrBandDelta(params.before.level, params.after.level);
  const itemCount = params.after.trials;
  const productiveRatio = params.after.trials > 0
    ? Math.round(
        ((params.productiveCorrectAfter ?? 0) / Math.max(1, params.after.trials)) * 100,
      ) / 100
    : 0;

  let noteZh: string;
  if (delta > 0) noteZh = `由 ${params.before.level} 提升到 ${params.after.level}（+${delta} 档）。`;
  else if (delta < 0) noteZh = `回落 ${Math.abs(delta)} 档（${params.before.level} → ${params.after.level}），已纳入下阶段计划。`;
  else noteZh = `维持在 ${params.after.level}（English360 内部估算，非官方认证）。`;

  return {
    scope: params.scope,
    checkpointDay: params.checkpointDay,
    timestamp: params.timestamp,
    before: params.before,
    after: params.after,
    delta,
    confidence: params.after.confidence,
    itemCount,
    productiveRatio,
    timeElapsedMs: Math.max(0, params.timestamp - params.beforeTime),
    skillsDelta: params.skillsDelta ?? {},
    noteZh,
  };
}

/**
 * Plan adjustment from a reassessment: the skill with the worst (most
 * negative) per-skill delta becomes the new remediation focus.
 */
export function adjustPlanFrom(record: ReassessmentRecord): PlanAdjustment {
  let worst: SkillKey | null = null;
  let worstDelta = 0;
  for (const [skill, d] of Object.entries(record.skillsDelta)) {
    if (d !== undefined && d < worstDelta) {
      worstDelta = d;
      worst = skill as SkillKey;
    }
  }
  if (worst && worstDelta < 0) {
    const boost = Math.min(0.5, Math.max(0.2, 0.2 + Math.abs(worstDelta) * 0.1));
    return {
      boost,
      focusSkill: worst,
      reasonZh: `「${worst}」出现 ${Math.abs(worstDelta)} 档回落，下阶段集中补强。`,
    };
  }
  return { boost: 0, focusSkill: null, reasonZh: "各技能保持或提升，维持当前重点。已按 English360 内部估算，非官方认证。" };
}

/** Checkpoint schedule helper: returns the next checkpoint day >= currentDay. */
export function nextCheckpoint(day: number, nowDay: number): number | null {
  for (const d of CHECKPOINT_DAYS) {
    if (d >= day && d > nowDay) return d;
  }
  return null;
}
