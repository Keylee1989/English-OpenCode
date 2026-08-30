import type { C2VocabRow } from "@/content/vocab/c2-types";
import { medicineHealthRows } from "@/content/vocab/groups/g219-medicine-health";
import { lawGovernanceRows } from "@/content/vocab/groups/g220-law-governance";
import { socialSciencesRows } from "@/content/vocab/groups/g221-social-sciences";
import { artsCultureRows } from "@/content/vocab/groups/g222-arts-culture";

/** Phase 18 · chunk R — Medicine, Law, Social Sciences, Arts & Culture. */
export const C2_ROWS_R: readonly C2VocabRow[] = [
  ...medicineHealthRows,
  ...lawGovernanceRows,
  ...socialSciencesRows,
  ...artsCultureRows,
];
