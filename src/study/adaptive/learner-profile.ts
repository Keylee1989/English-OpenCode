/**
 * Phase 21 — Diagnosis layer.
 *
 * Turns a Phase 20 BaselineResult (and complementary signals) into a formal
 * LearnerProfile that drives the adaptive plan. Pure + deterministic so it is
 * unit-testable without a database.
 *
 * IMPORTANT honesty contract: every CEFR value produced here is an
 * "English360 internal estimate" — NEVER presented as official certification
 * or a standardized test score. Speaking/writing bands inferred from learner
 * self-report are marked `selfReported` and never treated as equivalent to an
 * objective test.
 */
import type { SkillKey } from "@/core/types";
import type { AbilityEstimate } from "@/study/validation/adaptive";
import type { BaselineResult } from "@/study/validation/baseline-model";

export const CEFR_SCORE = 100;

/** Per-skill CEFR band as an ordinal position on the ladder. */
export const CEFR_ORDER: Record<string, number> = {
  A1: 0,
  A2: 1,
  B1: 2,
  B2: 3,
  C1: 4,
  C2: 5,
} as const;

/** Skills validated by the baseline (6). */
export const PROFILE_SKILLS: SkillKey[] = [
  "vocabulary",
  "grammar",
  "reading",
  "listening",
  "speaking",
  "writing",
];

export const SKILL_LABEL_ZH: Record<string, string> = {
  vocabulary: "词汇",
  grammar: "语法",
  reading: "阅读",
  listening: "听力",
  speaking: "口语",
  writing: "写作",
};

export interface ProfileSkill {
  skill: SkillKey;
  /** English360 internal estimate band (A1..C2). */
  band: string;
  /** 0..100 continuous estimate (Elo-derived, NOT percent-correct). */
  score: number;
  /** 0..1 evidence-bound confidence. */
  confidence: number;
  /** true when the band rests on learner self-report (speaking/writing w/o AI). */
  selfReported: boolean;
}

export interface LearnerGoals {
  /** Minutes the learner can spend per day (0..~720). */
  dailyMinutes: number;
  /** Optional target CEFR band (English360 internal estimate). */
  targetBand?: string;
}

export interface LearnerProfile {
  skills: ProfileSkill[];
  currentSkillBand: Record<string, string>;
  confidence: Record<string, number>;
  weakestSkills: ProfileSkill[];
  strongestSkills: ProfileSkill[];
  /** 0..1 gap between productive and receptive ability across skills. */
  receptiveProductiveGap: number;
  vocabularyGap: number;
  grammarGap: number;
  listeningGap: number;
  speakingGap: number;
  readingGap: number;
  writingGap: number;
  recommendedIntensity: "light" | "moderate" | "high";
  recommendedDailyMinutes: number;
  /** Fraction of daily time to dedicate to remediation (0..1). */
  recommendedFocusRatio: number;
  /** Honest notes shown to the learner. */
  notesZh: string[];
}

/**
 * Compute the 0..1 gap for a skill from a target reference. We treat the
 * strongest measured skill as the learner's realistic ceiling; a skill far
 * below it (or below a target band) is a gap. Higher = more remedial need.
 */
export function skillGap(score: number, reference: number, min = 0, max = 1): number {
  const rel = (reference - score) / Math.max(1, reference);
  return Math.min(max, Math.max(min, rel));
}

export interface ProfileInput {
  baseline: BaselineResult | null;
  /** Complementary productive/receptive ability from the student model (0..100). */
  receptiveAbility?: Partial<Record<SkillKey, number>>;
  productiveAbility?: Partial<Record<SkillKey, number>>;
  goals?: LearnerGoals;
  /** Skill keys whose baseline band is self-reported (i.e. no objective grader). */
  selfReportedSkills?: Iterable<SkillKey>;
}

function bandScore(band: string): number {
  return CEFR_ORDER[band] ?? 0;
}

export function buildLearnerProfile(input: ProfileInput): LearnerProfile {
  const baseline = input.baseline;
  const selfReported = new Set<SkillKey>(input.selfReportedSkills ?? []);
  const dailyMinutes = Math.max(0, input.goals?.dailyMinutes ?? 60);
  const targetBand = input.goals?.targetBand;
  const targetScore = targetBand ? CEFR_ORDER[targetBand] ?? 2 : undefined;

  const skills: ProfileSkill[] = PROFILE_SKILLS.map((skill) => {
    const est: AbilityEstimate | undefined = baseline?.skills?.[skill];
    const band = est && est.trials > 0 ? est.level : "A1";
    const score = est && est.trials > 0 ? est.score : 0;
    const confidence = est ? est.confidence : 0;
    return {
      skill,
      band,
      score,
      confidence,
      selfReported: selfReported.has(skill),
    };
  });

  const sorted = [...skills].sort((a, b) => b.score - a.score);
  const measurable = sorted.filter((s) => s.score > 0);
  const weakestSkills = measurable.length > 0 ? measurable.slice(-2) : [];
  const strongestSkills = measurable.length > 0 ? measurable.slice(0, 2) : [];

  // Receptive vs productive gap across all skills (0..1).
  let gapSum = 0;
  let gapN = 0;
  for (const skill of PROFILE_SKILLS) {
    const r = input.receptiveAbility?.[skill];
    const p = input.productiveAbility?.[skill];
    if (typeof r === "number" && typeof p === "number") {
      gapSum += Math.max(0, Math.min(1, (r - p) / Math.max(1, r)));
      gapN += 1;
    }
  }
  const receptiveProductiveGap = gapN > 0 ? gapSum / gapN : 0;

  // Reference ceiling = highest measured band ordinal (or target band ordinal).
  const ceiling = targetScore !== undefined
    ? Math.max(targetScore, measurable.length > 0 ? bandScore(measurable[0].band) : 0)
    : (measurable.length > 0 ? bandScore(measurable[0].band) : 0);

  const gapOf = (skill: SkillKey): number => {
    const s = skills.find((x) => x.skill === skill);
    if (!s || s.score <= 0) return ceiling > 0 ? 1 : 0;
    const bandS = bandScore(s.band);
    return skillGap(bandS, Math.max(1, ceiling));
  };

  const vocabularyGap = gapOf("vocabulary");
  const grammarGap = gapOf("grammar");
  const listeningGap = gapOf("listening");
  const speakingGap = gapOf("speaking");
  const readingGap = gapOf("reading");
  const writingGap = gapOf("writing");

  // Intensity: higher confidence + healthy ratios -> lighter; big gaps -> high.
  const avgConfidence = skills.length > 0
    ? skills.reduce((a, s) => a + s.confidence, 0) / skills.length
    : 0;
  const maxGap = Math.max(vocabularyGap, grammarGap, listeningGap, speakingGap, readingGap, writingGap);
  const recommendedIntensity: "light" | "moderate" | "high" =
    maxGap > 0.55 || receptiveProductiveGap > 0.5 ? "high" : maxGap > 0.3 ? "moderate" : "light";

  const recommendedDailyMinutes = Math.min(
    360,
    Math.max(30, Math.round(dailyMinutes * (recommendedIntensity === "high" ? 1 : recommendedIntensity === "moderate" ? 0.85 : 0.6))),
  );

  // Focus ratio = share of time on weak-skill remediation (0..0.5 clamp).
  const rawFocus = maxGap * (0.4 + avgConfidence * 0.2);
  const recommendedFocusRatio = Math.min(0.5, Math.max(0.15, rawFocus));

  const notesZh: string[] = [];
  if (selfReported.has("speaking") || selfReported.has("writing")) {
    notesZh.push(
      "口语/写作为自评或未接 AI 判分得出，为 English360 内部估算，非客观测试，也不等同于官方 CEFR 认证。",
    );
  }
  if (receptiveProductiveGap > 0.4) {
    notesZh.push(`听说输入与输出差距明显（差距 ${(receptiveProductiveGap * 100).toFixed(0)}%），建议优先做主动输出。`);
  }
  const gapLabels = [
    { g: listeningGap, label: "听力" },
    { g: speakingGap, label: "口语" },
    { g: writingGap, label: "写作" },
    { g: grammarGap, label: "语法" },
    { g: readingGap, label: "阅读" },
    { g: vocabularyGap, label: "词汇" },
  ]
    .filter((x) => x.g > 0)
    .sort((a, b) => b.g - a.g);
  if (gapLabels.length > 0) {
    notesZh.push(`今日主要差距（按缺口）：${gapLabels.slice(0, 3).map((x) => x.label).join("、")}。`);
  }

  return {
    skills,
    currentSkillBand: Object.fromEntries(skills.map((s) => [s.skill, s.band])) as Record<string, string>,
    confidence: Object.fromEntries(skills.map((s) => [s.skill, s.confidence])) as Record<string, number>,
    weakestSkills,
    strongestSkills,
    receptiveProductiveGap,
    vocabularyGap,
    grammarGap,
    listeningGap,
    speakingGap,
    readingGap,
    writingGap,
    recommendedIntensity,
    recommendedDailyMinutes,
    recommendedFocusRatio,
    notesZh,
  };
}
