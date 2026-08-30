/**
 * Phase 21 — Adaptive runtime loader (DB glue).
 *
 * Wraps the pure P0 engines with the real data layer so the app pages have a
 * single entry point to run the closed loop:
 *   Baseline -> Profile -> Priority -> Difficulty -> AdaptivePlan
 *
 * All honesty rules live at the boundary here:
 *   - CEFR values are "English360 internal estimate" (never official)
 *   - speaking/writing are flagged selfReported unless a real AI grader graded them
 */
import { loadBaselineCache } from "@/study/validation/baseline-model";
import {
  getProductiveAbility,
  getReceptiveAbility,
} from "@/engines/student/student-model-v0";
import {
  buildLearnerProfile,
  type LearnerProfile,
} from "@/study/adaptive/learner-profile";
import {
  skillWeight,
  type SkillPriority,
} from "@/study/adaptive/skill-priority";
import { decideNextDifficulty, type DifficultyResult } from "@/study/adaptive/difficulty-controller";
import { buildAdaptivePlan, type AdaptivePlan } from "@/study/adaptive/adaptive-plan";
import { dueSkillCount } from "@/study/adaptive/skill-review-queue";
import type { CefrLevel } from "@/study/validation/adaptive";
import type { SkillKey } from "@/core/types";

export interface AdaptiveDiagnosis {
  hasBaseline: boolean;
  profile: LearnerProfile | null;
  priorities: SkillPriority[];
  plan: AdaptivePlan | null;
  difficulty: Partial<Record<SkillKey, DifficultyResult>>;
  dueReviewCount: number;
  honestyLabel: string;
}

const CEFR_LIST: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

/** Start a learner at their measured band; difficulty is practice band. */
function bandFromProfile(p: LearnerProfile, skill: SkillKey): CefrLevel {
  const band = p.currentSkillBand[skill];
  return (CEFR_LIST as string[]).includes(band) ? (band as CefrLevel) : "A1";
}

/**
 * Build the adaptive diagnosis for the current learner. Pure-ish (DB reads)
 * but deterministic given inputs.
 */
export async function buildAdaptiveDiagnosis(
  opts: { minutes?: number } = {},
): Promise<AdaptiveDiagnosis> {
  const cache = await loadBaselineCache();
  const baseline = cache.latest;
  const [productive, receptive] = await Promise.all([
    getProductiveAbility(),
    getReceptiveAbility(),
  ]);

  const productiveNums: Partial<Record<SkillKey, number>> = {};
  const receptiveNums: Partial<Record<SkillKey, number>> = {};
  for (const s of Object.keys(productive)) {
    productiveNums[s as SkillKey] = productive[s as SkillKey]?.score ?? 0;
  }
  for (const s of Object.keys(receptive)) {
    receptiveNums[s as SkillKey] = receptive[s as SkillKey]?.score ?? 0;
  }

  const selfReportedSkills: SkillKey[] = ["speaking", "writing"];

  const profile = buildLearnerProfile({
    baseline,
    productiveAbility: productiveNums,
    receptiveAbility: receptiveNums,
    goals: { dailyMinutes: opts.minutes ?? 60 },
    selfReportedSkills,
  });

  const priorities = skillWeight(profile);

  const difficulty: Partial<Record<SkillKey, DifficultyResult>> = {};
  for (const sk of ["listening", "speaking", "reading", "writing", "vocabulary", "grammar"] as SkillKey[]) {
    difficulty[sk] = decideNextDifficulty({
      recent: [],
      currentBand: bandFromProfile(profile, sk),
    });
  }

  const due = await dueSkillCount();
  const dueReviewCount = due.reduce((a, d) => a + d.dueCount, 0);

  const plan = buildAdaptivePlan({
    profile,
    difficulty,
    dueReviewCount,
    goals: { dailyMinutes: opts.minutes ?? 60 },
  });

  return {
    hasBaseline: baseline != null,
    profile,
    priorities,
    plan,
    difficulty,
    dueReviewCount,
    honestyLabel: baseline
      ? "English360 内部估算（非官方 CEFR 认证）；口语/写作为自评或未接 AI 判分时仅作参考，非客观测试。"
      : "尚未完成基线评测。",
  };
}
