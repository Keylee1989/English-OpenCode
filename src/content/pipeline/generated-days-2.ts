/**
 * Phase 23 · Day 181-360 aggregation — real curriculum for the second half
 * of the 360-day course (6 blocks, B2→C2). Compiled via the same validated
 * buildDay pipeline used for Day 91-180.
 */
import { generateDays } from "@/content/pipeline/generate-days";
import type { CourseDayPlan } from "@/content/pipeline/generate-days";
import { PLAN_181_210 } from "./plan-181-210";
import { PLAN_211_240 } from "./plan-211-240";
import { PLAN_241_270 } from "./plan-241-270";
import { PLAN_271_300 } from "./plan-271-300";
import { PLAN_301_330 } from "./plan-301-330";
import { PLAN_331_360 } from "./plan-331-360";

const all: readonly CourseDayPlan[] = [
  ...PLAN_181_210,
  ...PLAN_211_240,
  ...PLAN_241_270,
  ...PLAN_271_300,
  ...PLAN_301_330,
  ...PLAN_331_360,
];

const unique = new Map<number, CourseDayPlan>();
for (const plan of all) unique.set(plan.day, plan);
const ordered = [...unique.values()].sort((a, b) => a.day - b.day);

export const GENERATED_DAYS_181_360 = generateDays(ordered);