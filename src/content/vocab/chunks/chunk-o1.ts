import type { C2VocabRow } from "@/content/vocab/c2-types";
import { academicArgumentRows } from "@/content/vocab/groups/g169-academic-argument";
import { researchMethodologyRows } from "@/content/vocab/groups/g170-research-methodology";
import { statisticsRows } from "@/content/vocab/groups/g171-statistics-data";
import { academicWritingRows } from "@/content/vocab/groups/g172-academic-writing";
import { criticalThinkingRows } from "@/content/vocab/groups/g173-critical-thinking";

/** Phase 16-A chunk O part 1 — academic/research/critical thinking (g169-g173). */
export const C2_ROWS_O1: readonly C2VocabRow[] = [
  ...academicArgumentRows,
  ...researchMethodologyRows,
  ...statisticsRows,
  ...academicWritingRows,
  ...criticalThinkingRows,
];
