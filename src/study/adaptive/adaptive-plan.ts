/**
 * Phase 21 — Adaptive learning plan.
 *
 * Produces a daily AdaptivePlan that splits the learner's available minutes
 * across the ten block types, weighted by the LearnerProfile's skill
 * priorities and difficulty. The plan is not "do all ten mechanically": skill
 * blocks with no remedial need get zero minutes, and bottlenecks get the bulk.
 *
 * Pure + deterministic (no DB) for the core planner; a thin loader that reads
 * SRS-due data separately is provided in adaptive-runtime.ts.
 */
import type { SkillKey } from "@/core/types";
import type { LearnerProfile } from "@/study/adaptive/learner-profile";
import {
  normalizedPriorities,
  type SkillPriority,
} from "@/study/adaptive/skill-priority";
import type { DifficultyResult } from "@/study/adaptive/difficulty-controller";

export type AdaptiveBlockKind =
  | "core-lesson"
  | "vocabulary"
  | "srs-review"
  | "weak-remediation"
  | "listening"
  | "speaking"
  | "reading"
  | "writing"
  | "grammar"
  | "checkpoint";

export interface AdaptiveBlock {
  kind: AdaptiveBlockKind;
  skill: SkillKey | null;
  labelZh: string;
  minutes: number;
  reasonZh: string;
}

export interface AdaptivePlan {
  dateISO: string;
  totalMinutes: number;
  profileIntensity: LearnerProfile["recommendedIntensity"];
  blocks: AdaptiveBlock[];
  focusSkills: SkillPriority[];
  notesZh: string[];
}

/** Minutes per block type; checkpoint is fixed. */
export const BASE_MINUTES: Record<AdaptiveBlockKind, number> = {
  "core-lesson": 25,
  vocabulary: 10,
  "srs-review": 15,
  "weak-remediation": 12,
  listening: 10,
  speaking: 10,
  reading: 10,
  writing: 10,
  grammar: 10,
  checkpoint: 8,
};

export const BLOCK_LABEL_ZH: Record<AdaptiveBlockKind, string> = {
  "core-lesson": "主课程",
  vocabulary: "词汇",
  "srs-review": "间隔复习",
  "weak-remediation": "薄弱技能专项",
  listening: "听力",
  speaking: "口语",
  reading: "阅读",
  writing: "写作",
  grammar: "语法",
  checkpoint: "测评/检查点",
};

/** The skill mapped to each block kind (or null). */
export const BLOCK_SKILL: Record<AdaptiveBlockKind, SkillKey | null> = {
  "core-lesson": "vocabulary",
  vocabulary: "vocabulary",
  "srs-review": null,
  "weak-remediation": null,
  listening: "listening",
  speaking: "speaking",
  reading: "reading",
  writing: "writing",
  grammar: "grammar",
  checkpoint: "reading",
};

export interface PlanInput {
  profile: LearnerProfile;
  /** Per-skill next difficulty decisions from the difficulty controller. */
  difficulty?: Partial<Record<SkillKey, DifficultyResult>>;
  /** Number of skills with due SRS review (to keep the review block honest). */
  dueReviewCount: number;
  goals?: { dailyMinutes?: number };
}

export function todayISO(nowMs: number = Date.now()): string {
  const d = new Date(nowMs);
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}

export function skillForBlock(kind: AdaptiveBlockKind): SkillKey | null {
  return BLOCK_SKILL[kind];
}

/**
 * Build the daily adaptive plan. Always includes the fixed-presence blocks
 * (core lesson, vocabulary, SRS review, checkpoint) but scales their minutes
 * down/up; skill blocks with no remedial need and zero gap are dropped unless
 * their ratio warrants a maintenance floor.
 */
export function buildAdaptivePlan(input: PlanInput): AdaptivePlan {
  const p = input.profile;
  const dailyMinutes = Math.max(30, Math.round(input.goals?.dailyMinutes ?? p.recommendedDailyMinutes));
  const priorities = normalizedPriorities(p);

  const norm: Record<SkillKey, number> = Object.fromEntries(
    priorities.map((x) => [x.skill, x.weight]),
  ) as Record<SkillKey, number>;

  // Maintenance floor for skills are present in the plan regardless of gap.
  const blocks: AdaptiveBlock[] = [];
  let allocated = 0;

  const push = (kind: AdaptiveBlockKind, skill: SkillKey | null, minutes: number, reasonZh: string) => {
    blocks.push({ kind, skill, labelZh: BLOCK_LABEL_ZH[kind], minutes, reasonZh });
    allocated += minutes;
  };

  // Core lesson — always present, scales with available time.
  const coreMin = Math.min(40, Math.max(15, Math.round(dailyMinutes * 0.3)));
  push("core-lesson", "vocabulary", coreMin, "主线课程：推进听力/口语能力主线。");

  // Weak remediation — the skill-skill bottleneck gets the largest share.
  const bottleneck = priorities[0];
  const d = input.difficulty?.[bottleneck.skill];
  const bandNote = d ? `（当前难度 ${d.nextBand}）` : "";
  const remMin = Math.round(dailyMinutes * (0.22 + bottleneck.weight * 0.15));
  push("weak-remediation", bottleneck.skill, remMin, `针对最薄弱技能「${bottleneck.labelZh}」${bandNote}`);

  // Skill blocks by priority (drop zero-gap skills beyond a maintenance floor).
  for (const kind of ["listening", "speaking", "reading", "writing", "grammar", "vocabulary"] as AdaptiveBlockKind[]) {
    const skill = skillForBlock(kind)!;
    const weight = norm[skill];
    if (kind === "vocabulary") {
      push("vocabulary", skill, Math.max(5, Math.round(dailyMinutes * 0.1)), "词汇维持与扩展。");
      continue;
    }
    const share = weight * dailyMinutes;
    if (share >= 8) {
      const dd = input.difficulty?.[skill];
      const note = dd ? `在 ${dd.nextBand} 档练习` : "";
      push(kind, skill, Math.round(share), `${BLOCK_LABEL_ZH[kind]}${note ? `：${note}` : ""}`);
    }
  }

  // SRS review — fixed presence; minutes reflect honesty (0 if nothing due).
  const srsMin = input.dueReviewCount > 0
    ? Math.min(20, Math.max(5, Math.round(dailyMinutes * 0.16)))
    : 0;
  if (srsMin > 0) {
    blocks.push({
      kind: "srs-review",
      skill: null,
      labelZh: BLOCK_LABEL_ZH["srs-review"],
      minutes: srsMin,
      reasonZh: `${input.dueReviewCount} 项到期复习。`,
    });
  }

  // Checkpoint (micro reassessment) — always present for learner confidence.
  push("checkpoint", "reading", 6, "微型检查点：确认今日掌握并更新能力模型。");

  const notesZh: string[] = [];
  if (bottleneck.weight > 0.5) {
    notesZh.push(`今日重点：缩小「${bottleneck.labelZh}」缺口。`);
  }
  if (p.receptiveProductiveGap > 0.4) {
    notesZh.push("输入与输出差距明显，今日练习加重主动输出比例。");
  }

  return {
    dateISO: todayISO(),
    totalMinutes: allocated,
    profileIntensity: p.recommendedIntensity,
    blocks,
    focusSkills: priorities,
    notesZh,
  };
}

