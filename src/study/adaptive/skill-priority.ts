/**
 * Phase 21 — Skill priority.
 *
 * Ranks the six validated skills by remedial need so the adaptive plan can
 * allocate time proportionally. Pure + deterministic.
 *
 * A skill is a strong bottleneck when it has a large gap AND sits in a
 * receptive/productive dependency chain (e.g. Listening/Speaking feed the
 * whole production pipeline). We intentionally boost Listening & Speaking so
 * that a learner with "Reading B2 but Listening A1" gets them prioritised,
 * rather than flattening them behind a well-scored overall.
 */
import type { SkillKey } from "@/core/types";
import type { LearnerProfile } from "@/study/adaptive/learner-profile";

export interface SkillPriority {
  skill: SkillKey;
  /** 0..1 remedial priority (higher = more urgent). */
  weight: number;
  gap: number;
  labelZh: string;
}

export const SKILL_LABEL_ZH: Record<string, string> = {
  vocabulary: "词汇",
  grammar: "语法",
  reading: "阅读",
  listening: "听力",
  speaking: "口语",
  writing: "写作",
};

/** Oral production boost: Listening & Speaking get extra weight when lagging. */
export const ORAL_BOOST: Record<string, number> = { listening: 1.25, speaking: 1.3 };
export const DEFAULT_BOOST = 1;

export function skillWeight(profile: LearnerProfile): SkillPriority[] {
  const gaps: Record<string, number> = {
    vocabulary: profile.vocabularyGap,
    grammar: profile.grammarGap,
    reading: profile.readingGap,
    listening: profile.listeningGap,
    speaking: profile.speakingGap,
    writing: profile.writingGap,
  };

  const boosts: Record<string, number> = {
    vocabulary: DEFAULT_BOOST,
    grammar: DEFAULT_BOOST,
    reading: 1.1,
    listening: ORAL_BOOST.listening,
    speaking: ORAL_BOOST.speaking,
    writing: 1.15,
  };

  const raw = (Object.keys(gaps) as SkillKey[]).map((skill) => {
    const gap = gaps[skill];
    const weight = Math.min(1, Math.max(0, gap * boosts[skill]));
    return { skill, weight, gap, labelZh: SKILL_LABEL_ZH[skill] ?? skill };
  });

  return raw.sort((a, b) => b.weight - a.weight);
}

/**
 * Normalised priority (weights sum to 1) — used to split available minutes.
 * Single-skill floor of 5% prevents a hard-zero on an untested-but-required
 * skill from vanishing entirely.
 */
export function normalizedPriorities(profile: LearnerProfile): SkillPriority[] {
  const sorted = skillWeight(profile);
  const total = sorted.reduce((a, p) => a + p.weight, 0);
  if (total <= 0) {
    return sorted.map((p) => ({ ...p, weight: 1 / Math.max(1, sorted.length) }));
  }
  const FLOOR = 0.05;
  const sum = sorted.length * FLOOR;
  const scale = Math.max(0, 1 - sum);
  return sorted.map((p) => ({
    ...p,
    weight: FLOOR + (p.weight / total) * scale,
  }));
}

/** True when a skill is a genuine bottleneck (gap high and priority top). */
export function isBottleneck(profile: LearnerProfile, skill: SkillKey): boolean {
  const sorted = skillWeight(profile);
  const here = sorted.find((p) => p.skill === skill);
  if (!here) return false;
  const top = sorted[0];
  return here.weight >= 0.5 && here.weight >= (top?.weight ?? 0) * 0.9;
}
