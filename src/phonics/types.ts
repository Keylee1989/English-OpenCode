/**
 * Phonics types - grapheme-phoneme correspondences (GPC) for American English,
 * curated for zero-basis Chinese adult learners.
 */

export type PhonicsRuleType = "consonant" | "vowel" | "cluster" | "r-controlled";

export interface PhonicsRule {
  /** Stable id, e.g. "sh", "ee", "th-vl", "bl". */
  id: string;
  /** Spellings that map to this sound, matched longest-first. */
  graphemes: string[];
  /** IPA with slashes, e.g. "/ʃ/". */
  phoneme: string;
  type: PhonicsRuleType;
  /** Chinese articulation tip (aid only - audio remains authoritative). */
  tipZh: string;
  /** Example words (should exist in the core vocabulary). */
  examples: string[];
}

/** One decoded segment of a word. */
export interface DecodedSegment {
  grapheme: string;
  /** IPA with slashes, or null when this letter(s) had no rule match. */
  phoneme: string | null;
  ruleId: string | null;
}

export interface DecodeResult {
  word: string;
  segments: DecodedSegment[];
  /** Letters (in order) that had no rule match - honest gaps shown to learner. */
  uncovered: string[];
  /** Matched graphemes' total length / word length, 0..1. */
  coverage: number;
}

/** Minimal pair for listening discrimination (both endpoints must be real vocab ids). */
export interface MinimalPair {
  id: string;
  aWord: string;
  bWord: string;
  contrastZh: string;
}
