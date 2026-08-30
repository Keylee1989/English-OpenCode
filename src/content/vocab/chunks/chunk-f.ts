/**
 * Vocabulary chunk F (Phase 5) - loaded via dynamic import.
 * Contains: g89-g99 (Phase 5 expansion: advanced life/work/US culture).
 */
import { verbsAdvancedRows } from "@/content/vocab/groups/g89-verbs-advanced";
import { verbsAdvanced2Rows } from "@/content/vocab/groups/g90-verbs-advanced2";
import { adjectivesAdvancedRows } from "@/content/vocab/groups/g91-adjectives-advanced";
import { nounsSociety3Rows } from "@/content/vocab/groups/g92-nouns-society3";
import { idiomsChunks1Rows } from "@/content/vocab/groups/g93-idioms-chunks1";
import { financeHouseholdRows } from "@/content/vocab/groups/g94-finance-household";
import { cultureUsa1Rows } from "@/content/vocab/groups/g95-culture-usa1";
import { businessEmailRows } from "@/content/vocab/groups/g97-business-email";
import { meetingsNegotiationRows } from "@/content/vocab/groups/g98-meetings-negotiation";
import { careerSkills2Rows } from "@/content/vocab/groups/g99-career-skills2";
import type { VocabRow } from "@/content/vocab/types";

export const ROWS: readonly VocabRow[] = [
  ...verbsAdvancedRows,
  ...verbsAdvanced2Rows,
  ...adjectivesAdvancedRows,
  ...nounsSociety3Rows,
  ...idiomsChunks1Rows,
  ...financeHouseholdRows,
  ...cultureUsa1Rows,
  ...businessEmailRows,
  ...meetingsNegotiationRows,
  ...careerSkills2Rows,
];
