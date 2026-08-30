/**
 * Adaptive Learning Engine (+ Learning Velocity control).
 *
 * Contract:
 * - Decides WHAT to study next using the Student Model: skill balance
 *   (e.g. push listening/speaking if reading races ahead), difficulty
 *   scaling, new-vs-review ratio, input/output ratio.
 * - Velocity control (spec §23): observes learning rate, retention,
 *   fatigue indicators; adjusts volume/load - never trading long-term
 *   retention for surface progress.
 * - Must be bypassable: manual mode (spec §22) with explicit user settings;
 *   system may advise but never silently override user choices.
 *
 * PHASE 0: interface only - no implementation.
 */
import type { SkillKey } from "@/core/types";

export interface NextStepRecommendation {
  primarySkill: SkillKey;
  reasonZh: string;
  /** Suggested mix of activity types for the next block. */
  suggestedMix: Array<{ skill: SkillKey; weight: number }>;
  newVsReviewRatio: number;
}

export interface IAdaptiveLearningEngine {
  recommendNextStep(): Promise<NextStepRecommendation>;
  /** Difficulty knob given recent performance trend (0..1). */
  getTargetDifficulty(): Promise<number>;
}
