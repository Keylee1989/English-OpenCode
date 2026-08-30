/**
 * Error Analysis + Progress + Gamification + Achievement engines.
 *
 * Error Analysis (spec §36): Error Bank with category/frequency/severity/
 * recurrence; auto-detects top recurring errors and generates targeted drills.
 *
 * Progress (spec §34): displays REAL ability (per skill, receptive/productive,
 * stage distribution) - never course completion percentage.
 *
 * Gamification/Achievement (spec §33): XP/streaks/badges bound to real
 * learning behavior and ability evidence; never to meaningless clicks.
 *
 * PHASE 0: interfaces only - no implementation, no fake counters.
 */
import type { ErrorRecord, SkillKey } from "@/core/types";

export interface IErrorAnalysisEngine {
  recordError(error: Omit<ErrorRecord, "id" | "occurredAt" | "resolvedAt">): Promise<void>;
  getTopErrors(limit: number): Promise<Array<ErrorRecord & { frequency: number }>>;
  generateTargetedDrills(category: string): Promise<void>;
}

export interface IProgressEngine {
  /** Ability-focused progress snapshot for the home screen. */
  getAbilityProgress(): Promise<
    Array<{ skill: SkillKey; score: number; confidence: number; trend: "up" | "flat" | "down" }>
  >;
}

export interface IGamificationEngine {
  /** XP is awarded for verified learning events only. */
  awardXpForEvent(eventId: string): Promise<{ totalXp: number }>;
  getStreakDays(): Promise<number>;
}

export interface IAchievementEngine {
  listAchievements(): Promise<
    Array<{ id: string; titleZh: string; unlockedAt: number | null; evidence: string }>
  >;
}
