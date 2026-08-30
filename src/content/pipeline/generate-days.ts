import { buildDay, type DaySpec } from "@/content/days/factory";

/**
 * Course generation pipeline (Phase 5) - Day 91-180.
 *
 * Compact day plans (one entry per day) are compiled into full DayContent via
 * the existing buildDay() factory. Vocabulary references the merged lexical
 * model (spiral review of Day 1-90 words + Phase 5 additions); grammar
 * references the 12-topic Grammar Engine; phonics references the rule library.
 * A validation test guarantees: sequential days, resolvable vocab/grammar/
 * phonics ids, complete hooks - so no hand-written scattered files.
 */
export type CourseDayPlan = Omit<DaySpec, "pattern"> & {
  pattern: {
    titleZh: string;
    explainZh: string;
    examples: Array<[string, string]>;
    sentences: Array<[string, string]>;
  };
};

function toSpec(plan: CourseDayPlan): DaySpec {
  return { ...plan };
}

export function generateDays(plans: readonly CourseDayPlan[]): ReturnType<typeof buildDay>[] {
  return plans.map(toSpec).map(buildDay);
}
