/**
 * Exercise contracts for the Phase 1 study loop.
 *
 * Every exercise type has a defined learning purpose and maps to exactly one
 * skill + interaction kind when tracked (see generate-exercises.ts).
 * Grading lives in grade.ts as pure functions so it is fully unit-testable.
 */

export type ExerciseSkill =
  | "vocabulary"
  | "grammar"
  | "listening"
  | "speaking"
  | "reading"
  | "writing";

interface ExerciseBase {
  id: string;
  /** Primary skill credited for this exercise. */
  skill: ExerciseSkill;
  /** True if the browser must support speech synthesis to run it. */
  requiresAudio?: boolean;
}

export interface McqMeaningExercise extends ExerciseBase {
  type: "mcq-meaning";
  itemId: string;
  wordEn: string;
  /** Chinese meaning options; one correct. */
  optionsZh: string[];
  answerIndex: number;
  explainZh: string;
}

export interface McqReverseExercise extends ExerciseBase {
  type: "mcq-reverse";
  itemId: string;
  promptZh: string;
  optionsEn: string[];
  answerIndex: number;
  explainZh: string;
}

export interface McqListeningWordExercise extends ExerciseBase {
  type: "mcq-listening-word";
  itemId: string;
  speakText: string;
  optionsEn: string[];
  answerIndex: number;
}

export interface ListenJudgeExercise extends ExerciseBase {
  type: "listen-judge";
  itemId?: string;
  speakText: string;
  /** Sentence shown on screen; learner judges if the audio matches. */
  displaySentence: string;
  isSame: boolean;
  zh: string;
}

export interface FillBlankExercise extends ExerciseBase {
  type: "fill-blank";
  /** Pattern sentences are day-level; itemId optional. */
  itemId?: string;
  grammarTopicId?: string;
  /** Sentence containing ___ where the target word goes. */
  template: string;
  answer: string;
  zh: string;
  explainZh: string;
}

export interface RecallTypeExercise extends ExerciseBase {
  type: "recall-type";
  itemId: string;
  promptZh: string;
  answer: string;
}

export interface SentenceOrderExercise extends ExerciseBase {
  type: "sentence-order";
  itemId?: string;
  grammarTopicId?: string;
  /** Shuffled tokens (deterministic per exercise id). */
  tokens: string[];
  answer: string;
  zh: string;
}

export interface ShadowingExercise extends ExerciseBase {
  type: "shadowing";
  itemId?: string;
  speakText: string;
  en: string;
  zh: string;
}

/** Minimal-pair listening discrimination (Phase 2 phonics system). */
export interface PhonicsDiscriminationExercise extends ExerciseBase {
  type: "phonics-discriminate";
  skill: "listening";
  requiresAudio: true;
  pairId: string;
  /** The word actually spoken. */
  targetWord: string;
  speakText: string;
  optionsEn: [string, string];
  answerIndex: 0 | 1;
  tipZh: string;
}

/** 改错：wrong sentence shown; pick the correct rewrite. (Phase 3 grammar) */
export interface GrammarCorrectExercise extends ExerciseBase {
  type: "grammar-correct";
  skill: "grammar";
  itemId?: string;
  grammarTopicId: string;
  promptEn: string;
  optionsEn: string[];
  answerIndex: number;
  explainZh: string;
}

/** 中译英：type the English for a Chinese prompt. Output production. */
export interface TranslationExercise extends ExerciseBase {
  type: "translate-zh-en";
  skill: "writing";
  itemId?: string;
  grammarTopicId?: string;
  promptZh: string;
  acceptedAnswers: string[];
  modelAnswer: string;
  hintEn?: string;
}

/** 造句：guided production with model-answer self-check (no fake scoring). */
export interface GuidedProductionExercise extends ExerciseBase {
  type: "guided-production";
  skill: "writing";
  itemId?: string;
  grammarTopicId?: string;
  cueZh: string;
  requiredWords: string[];
  modelAnswer: string;
}

/** 阅读理解：short passage + one comprehension question. */
export interface ReadingComprehensionExercise extends ExerciseBase {
  type: "reading-comprehension";
  skill: "reading";
  passageId: string;
  passage: { en: string; zh: string };
  questionEn: string;
  optionsEn: string[];
  answerIndex: number;
  explainZh?: string;
}

export type Exercise =
  | McqMeaningExercise
  | McqReverseExercise
  | McqListeningWordExercise
  | ListenJudgeExercise
  | FillBlankExercise
  | RecallTypeExercise
  | SentenceOrderExercise
  | ShadowingExercise
  | PhonicsDiscriminationExercise
  | GrammarCorrectExercise
  | TranslationExercise
  | GuidedProductionExercise
  | ReadingComprehensionExercise;

/** What the learner submitted for grading. */
export type ExerciseAnswer =
  | { kind: "choice"; index: number }
  | { kind: "text"; text: string }
  | { kind: "tokens"; order: number[] }
  | { kind: "yes" }
  | { kind: "no" }
  | { kind: "self-rated-able" }
  | { kind: "self-rated-unable" }
  | { kind: "production-matched" }
  | { kind: "production-off" };

export interface GradeResult {
  correct: boolean;
}
