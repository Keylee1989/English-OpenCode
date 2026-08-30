import type { C2VocabRow } from "@/content/vocab/c2-types";
import { literatureRows } from "@/content/vocab/groups/g163-literature";
import { philosophyRows } from "@/content/vocab/groups/g164-philosophy";
import { psychologyRows } from "@/content/vocab/groups/g165-psychology";
import { businessRows } from "@/content/vocab/groups/g166-business";
import { mediaRows } from "@/content/vocab/groups/g167-media";
import { nativeCollocationsRows } from "@/content/vocab/groups/g168-native-collocations";

/** Phase 15-A chunk K — literature, philosophy, psychology, business, media, native collocations. */
export const C2_ROWS_K: readonly C2VocabRow[] = [
  ...literatureRows,
  ...philosophyRows,
  ...psychologyRows,
  ...businessRows,
  ...mediaRows,
  ...nativeCollocationsRows,
];
