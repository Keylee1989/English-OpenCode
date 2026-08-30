import type { C2VocabRow } from "@/content/vocab/c2-types";
import { sociologyRows } from "@/content/vocab/groups/g209-sociology";
import { journalismEthicsRows } from "@/content/vocab/groups/g211-journalism-ethics";
import { academicDiscourseRows } from "@/content/vocab/groups/g212-academic-discourse";
import { persuasionRhetoricRows } from "@/content/vocab/groups/g213-persuasion-rhetoric";
import { emotionalVocabRows } from "@/content/vocab/groups/g214-emotional-vocabulary";

/** Phase 18 · chunk P — Sociology, Journalism, Academic Discourse, Persuasion, Emotional Vocabulary. */
export const C2_ROWS_P: readonly C2VocabRow[] = [
  ...sociologyRows,
  ...journalismEthicsRows,
  ...academicDiscourseRows,
  ...persuasionRhetoricRows,
  ...emotionalVocabRows,
];
