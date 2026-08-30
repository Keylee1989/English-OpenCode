import type { C2VocabRow } from "@/content/vocab/c2-types";
import { advancedPhrasalRows } from "@/content/vocab/groups/g181-advanced-phrasal";
import { conversationFillersRows } from "@/content/vocab/groups/g184-conversation-fillers";
import { humorSarcasmRows } from "@/content/vocab/groups/g185-humor-sarcasm";
import { culturalExpressionsRows } from "@/content/vocab/groups/g186-cultural-expressions";
import { aiMlRows } from "@/content/vocab/groups/g193-ai-ml";
import { debateLanguageRows } from "@/content/vocab/groups/g207-debate-language";
import { nuanceWordsRows } from "@/content/vocab/groups/g204-nuance-words";

/** Phase 16-A chunk O part 3 — native fluency + AI + debate (g181-g207). */
export const C2_ROWS_O3: readonly C2VocabRow[] = [
  ...advancedPhrasalRows,
  ...conversationFillersRows,
  ...humorSarcasmRows,
  ...culturalExpressionsRows,
  ...aiMlRows,
  ...debateLanguageRows,
  ...nuanceWordsRows,
];
