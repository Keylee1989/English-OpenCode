/** Phase 10-B: Day 91-180 aggregation — full Phase 1 curriculum complete. */
import { generateDays } from "@/content/pipeline/generate-days";
import type { CourseDayPlan } from "@/content/pipeline/generate-days";
import { PLAN_91_120 } from "./plan-91-120";
import { PLAN_101_110 } from "./plan-101-110";
import { PLAN_111_130 } from "./plan-111-130";
import { PLAN_118_125 } from "./plan-118-125";
import { PLAN_126_130 } from "./plan-126-130";
import { PLAN_131_150 } from "./plan-131-137";
import { PLAN_138_150 } from "./plan-138-143-clean";
import { PLAN_144_150_CLEAN } from "./plan-144-150-clean";
import { PLAN_151_160 } from "./plan-151-160";
import { PLAN_161_170 } from "./plan-161-170";
import { PLAN_171_180 } from "./plan-171-180";

const all: readonly CourseDayPlan[] = [
  ...PLAN_91_120.filter((p) => p.day >= 91 && p.day <= 100),
  ...PLAN_101_110,
  ...PLAN_111_130.filter((p) => p.day >= 111 && p.day <= 117),
  ...PLAN_118_125,
  ...PLAN_126_130,
  ...PLAN_131_150.filter((p) => p.day >= 131 && p.day <= 137),
  ...PLAN_138_150.filter((p) => p.day >= 138 && p.day <= 143),
  ...PLAN_144_150_CLEAN,
  ...PLAN_151_160,
  ...PLAN_161_170,
  ...PLAN_171_180,
];

const unique = new Map<number, CourseDayPlan>();
for (const plan of all) unique.set(plan.day, plan);
const ordered = [...unique.values()].sort((a, b) => a.day - b.day);

export const GENERATED_DAYS = generateDays(ordered);
