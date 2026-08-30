import type { C2VocabRow } from "@/content/vocab/c2-types";
import { c1AcademicRows } from "@/content/vocab/groups/g151-c1-academic";
import { c2AbstractRows } from "@/content/vocab/groups/g152-c2-abstract";
import { idiomsRows } from "@/content/vocab/groups/g153-idioms";
import { phrasalVerbsRows } from "@/content/vocab/groups/g154-phrasal-verbs";
import { registerFormalRows } from "@/content/vocab/groups/g155-register-formal";
import { registerCasualRows } from "@/content/vocab/groups/g156-register-casual";

/** Phase 15-A chunk I — C1/C2 academic, abstract, idioms, phrasal verbs, register. */
export const C2_ROWS_I: readonly C2VocabRow[] = [
  ...c1AcademicRows,
  ...c2AbstractRows,
  ...idiomsRows,
  ...phrasalVerbsRows,
  ...registerFormalRows,
  ...registerCasualRows,
];
