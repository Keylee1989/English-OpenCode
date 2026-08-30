/**
 * Vocabulary Engine.
 *
 * Contract:
 * - Manages the 12000+ word knowledge base with rich per-word data
 *   (IPA, audio ref, POS, frequency, CEFR, collocations, chunks, word
 *   family, roots/affixes, synonyms/antonyms, common errors...).
 * - Distinguishes receptive vs productive mastery; "recognized" is never
 *   reported as "known".
 * - Selects memory methods adaptively (delegated to Memory Engine decision,
 *   this engine supplies method candidates per word: homophone mnemonics are
 *   aids only, never a substitute for correct pronunciation).
 *
 * PHASE 0: interface only. No vocabulary data is bundled in Phase 0.
 */
import type { KnowledgeItem } from "@/core/types";

export interface LexicalEntry extends KnowledgeItem {
  pos: string;
  cefr?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  /** Zipf-like corpus frequency rank bucket 1..7. */
  frequencyBand?: number;
  collocationIds?: string[];
  wordFamilyIds?: string[];
}

export interface IVocabularyEngine {
  getEntry(id: string): Promise<LexicalEntry | null>;
  search(query: string): Promise<LexicalEntry[]>;
  stats(): Promise<{ totalEntries: number; byStage: Record<string, number> }>;
}
