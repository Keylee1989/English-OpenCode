import { day1 } from "@/content/days/day1";
import { day2 } from "@/content/days/day2";
import { day3 } from "@/content/days/day3";
import { day4 } from "@/content/days/day4";
import { day5 } from "@/content/days/day5";
import { day6 } from "@/content/days/day6";
import { day7 } from "@/content/days/day7";
import { EXTENDED_DAYS } from "@/content/days/days-extended";
import type { DayContent } from "@/content/types";

/**
 * Phase 4-B performance: Day 31-90 content lives behind dynamic imports so the
 * initial bundle stays small. Top-level await resolves the three chunks during
 * module evaluation; bundlers emit them as separate async chunks that the
 * browser fetches in parallel (and the PWA precaches for offline use).
 */
const [part31, part51, part71, part91, part360] = await Promise.all([
  import("@/content/days/days31-50"),
  import("@/content/days/days51-70"),
  import("@/content/days/days71-90"),
  import("@/content/pipeline/generated-days"),
  import("@/content/pipeline/generated-days-2"),
]);

/** All authored curriculum days, in order (Day 1-360 as of Phase 23). */
export const DAYS: readonly DayContent[] = [
  day1,
  day2,
  day3,
  day4,
  day5,
  day6,
  day7,
  ...EXTENDED_DAYS,
  ...part31.DAYS_31_50,
  ...part51.DAYS_51_70,
  ...part71.DAYS_71_90,
  ...part91.GENERATED_DAYS,
  ...part360.GENERATED_DAYS_181_360,
];
