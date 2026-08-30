/**
 * Daily Planner.
 *
 * Contract:
 * - Builds a priority-ordered plan from available minutes (30..240+ or custom).
 * - Priority order when time is short: critical SRS -> weak skills ->
 *   high-value input -> high-value output (spec §24).
 * - Missing a target is NEVER framed as failure.
 *
 * PHASE 0: interface only - no implementation.
 */
import type { DailyPlan } from "@/core/types";

export interface IDailyPlannerEngine {
  buildPlan(availableMinutes: number, dateISO?: string): Promise<DailyPlan>;
  /** Re-plan mid-day after actual performance. */
  replan(completedTaskIds: string[], remainingMinutes: number): Promise<DailyPlan>;
}
