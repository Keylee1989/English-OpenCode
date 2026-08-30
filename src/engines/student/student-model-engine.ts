/**
 * Student Model - the system's belief about the learner's REAL abilities.
 *
 * Contract:
 * - Maintains continuous ability estimates per skill with confidence,
 *   updated from LearningEvents (accuracy, latency, error type, transfer...).
 * - Explicitly NOT "percent correct": estimates must account for difficulty
 *   of material, recency, and receptive vs productive evidence separately.
 * - Consumed by: Adaptive Engine, Planner, Assessment, Progress UI.
 *
 * PHASE 0: interface only - no implementation.
 */
import type {
  AbilityScore,
  LearningEvent,
  MasteryStage,
  SkillKey,
} from "@/core/types";

export interface IStudentModelEngine {
  /** Current best estimate for one skill. */
  getAbility(skill: SkillKey): Promise<AbilityScore>;
  getOverallAbility(): Promise<AbilityScore>;
  /** Full snapshot for progress display / export. */
  snapshot(): Promise<Record<SkillKey, AbilityScore>>;

  /** Feed observed evidence; model updates asynchronously but durably. */
  observe(event: LearningEvent): Promise<void>;

  /**
   * Receptive (listening/reading) vs productive (speaking/writing) evidence
   * must stay distinguishable - shadowing scores can never count as free
   * speaking ability.
   */
  getProductiveAbility(): Promise<Partial<Record<SkillKey, AbilityScore>>>;
  getReceptiveAbility(): Promise<Partial<Record<SkillKey, AbilityScore>>>;

  /** Highest evidenced mastery ladder position for an item. */
  getItemMastery(itemId: string): Promise<MasteryStage | "unseen">;

  /** Fatigue / overload signals used by velocity control (spec §23). */
  getFatigueIndicators(): Promise<{ recentErrorRate: number; avgLatencyTrendMs: number }>;
}
