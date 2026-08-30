/**
 * Vocabulary Model v0 - structure ready for 12,000+ entries.
 *
 * Authoring uses compact rows (see builder); runtime exposes full
 * LexicalEntry objects. Every entry carries meaning/ipa/example/collocations;
 * relations (family/synonym/antonym/confusion) reference other entry ids and
 * are validated by tests - dangling endpoints are build errors, not silent.
 * Phonics data is DERIVED from the Phonics System at query time (knowledge
 * model), never hand-copied per word.
 */

export interface LexicalEntryV2 {
  /** Stable id "w:<word>". */
  id: string;
  word: string;
  zh: string;
  ipa: string;
  pos: string;
  /** Zipf-style frequency band 1(最常用)..7. */
  frequencyBand: number;
  /** Intrinsic difficulty 0..1 (seeds memory model). */
  difficulty: number;
  example: { en: string; zh: string };
  /** Common collocation phrases in English. */
  collocations: string[];
  /** Morphologically related entry ids (real derivations only). */
  wordFamilyIds: string[];
  synonymIds: string[];
  antonymIds: string[];
  /** Minimal-pair partners (listening confusion), auto-linked from Phonics. */
  confusionPairIds: string[];
  // --- Phase 15-A: optional CEFR display layer (C2 expansion rows only) ---
  level?: string;
  register?: string;
  usage?: string;
  meaningNuance?: string;
}

/** Compact authoring row. */
export interface VocabRow {
  word: string;
  zh: string;
  ipa: string;
  pos: string;
  band: number;
  diff: number;
  exEn: string;
  exZh: string;
  col: string;
  extra?: {
    fam?: string[];
    syn?: string[];
    ant?: string[];
  };
}
