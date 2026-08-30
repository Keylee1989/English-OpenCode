import type { C2VocabRow } from "@/content/vocab/c2-types";
import { americanExpressionRows } from "@/content/vocab/groups/g157-american-expression";
import { politicsSocietyRows } from "@/content/vocab/groups/g158-politics-society";
import { economicsRows } from "@/content/vocab/groups/g159-economics";
import { scienceRows } from "@/content/vocab/groups/g160-science";
import { lawRows } from "@/content/vocab/groups/g161-law";
import { medicalRows } from "@/content/vocab/groups/g162-medical";

/** Phase 15-A chunk J — American expression, politics/society, economics, science, law, medical. */
export const C2_ROWS_J: readonly C2VocabRow[] = [
  ...americanExpressionRows,
  ...politicsSocietyRows,
  ...economicsRows,
  ...scienceRows,
  ...lawRows,
  ...medicalRows,
];
