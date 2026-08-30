/**
 * Curriculum content contracts (Phase 1: Day 1-7 authored content).
 *
 * Content is authored in TypeScript (not JSON) so the compiler enforces the
 * shape of every lesson. All explanations target a zero-basis Chinese adult
 * learner: Chinese-dominant scaffolding that later phases will fade.
 */

export interface VocabEntry {
  /** Stable id, e.g. "w:hi". Referenced by events/memory states. */
  id: string;
  word: string;
  /** Simplified Chinese meaning(s). */
  zh: string;
  /** American English IPA. */
  ipa: string;
  pos: string;
  example: { en: string; zh: string };
  /** Intrinsic difficulty 0..1 - seeds the memory model. */
  difficulty: number;
  /** Chinese pronunciation/phonics hint (aid only, never replaces audio). */
  phonicsHintZh?: string;
}

export interface PatternExample {
  en: string;
  zh: string;
}

/** Short leveled passage for daily reading practice. */
export interface DayReading {
  en: string;
  zh: string;
}

/** One core sentence pattern per day ("grammar light" for zero basis). */
export interface PatternLesson {
  id: string;
  titleZh: string;
  explainZh: string;
  /** Taught examples shown on the lesson card. */
  examples: PatternExample[];
  /** Sentences reused by listening/ordering/shadowing practice. */
  practiceSentences: PatternExample[];
}

export interface DayContent {
  day: number;
  titleEn: string;
  titleZh: string;
  goalZh: string;
  /** Day 1-7 authored inline entries. New days reference the lexical model. */
  vocab: VocabEntry[];
  /** Phase 3+: word ids resolved against the Vocabulary Model. */
  vocabIds?: string[];
  pattern: PatternLesson;
  phonicsNoteZh: string;
  /** Grammar Engine topic driving this day's grammar training. */
  grammarTopicId?: string;
  phonicsFocus?: { ruleIds: string[]; pairIds?: string[] };
  /** Leveled mini-passage(s) for reading practice. */
  reading?: DayReading[];
  /** Daily writing task: Chinese cue + English scaffold hint. */
  writingPrompt?: { zh: string; hintEn: string };
}
