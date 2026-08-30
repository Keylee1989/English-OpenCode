import type { C2VocabRow } from "@/content/vocab/c2-types";
import { advancedPhrasalRows } from "@/content/vocab/groups/g181-advanced-phrasal";
import { conversationFillersRows } from "@/content/vocab/groups/g184-conversation-fillers";
import { humorSarcasmRows } from "@/content/vocab/groups/g185-humor-sarcasm";
import { nuanceWordsRows } from "@/content/vocab/groups/g204-nuance-words";

/** Phase 16-A chunk N — native fluency expansion (phrasal/fillers/humor/nuance). */
export const C2_ROWS_N: readonly C2VocabRow[] = [
  ...advancedPhrasalRows,
  ...conversationFillersRows,
  ...humorSarcasmRows,
  ...nuanceWordsRows,
];
