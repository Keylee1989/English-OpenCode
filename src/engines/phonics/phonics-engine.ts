/**
 * Phonics + Pronunciation Engines.
 *
 * Phonics path (spec §9): alphabet -> phonemes -> grapheme-phoneme mapping
 * -> blending -> syllables -> word stress -> sentence stress -> connected
 * speech -> reductions -> intonation -> natural speech.
 *
 * Pronunciation: imitation with feedback. Browser speech APIs on iOS Safari
 * are limited; implementations MUST degrade gracefully and never fake a
 * score when audio analysis is unavailable (spec §44).
 *
 * PHASE 0: interfaces only - no implementation, no TTS wiring yet.
 */

export interface IPhonicsEngine {
  /** Ordered phonics curriculum nodes for the current learner state. */
  getPathProgress(): Promise<Array<{ nodeId: string; completed: boolean }>>;
}

export type PronunciationFeedback = {
  /** null when no reliable scoring is possible on this browser. */
  overallScore: number | null;
  issuesZh: string[];
  canAutoScore: boolean;
};

export interface IPronunciationEngine {
  /**
   * Evaluate an utterance against target text.
   * Returns canAutoScore=false instead of inventing a score.
   */
  evaluate(targetText: string, recordedAudioBlob: Blob): Promise<PronunciationFeedback>;
}
