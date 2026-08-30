import type { C2VocabRow } from "@/content/vocab/c2-types";
import { environmentSustainabilityRows } from "@/content/vocab/groups/g223-environment-sustainability";
import { psychologyCognitionRows } from "@/content/vocab/groups/g224-psychology-cognition";
import { philosophyEthicsRows } from "@/content/vocab/groups/g225-philosophy-ethics";

/** Phase 18 · chunk S — Environment, Psychology, Philosophy. */
export const C2_ROWS_S: readonly C2VocabRow[] = [
  ...environmentSustainabilityRows,
  ...psychologyCognitionRows,
  ...philosophyEthicsRows,
];
