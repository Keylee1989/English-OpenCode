/**
 * Skill engines: Grammar / Listening / Speaking / Reading / Writing.
 *
 * Shared contract for every skill engine:
 * - generatePractice() builds exercises from local content first;
 *   AI-generated exercises are an enhancement, never a dependency.
 * - Every interaction type must have a defined learning purpose.
 * - Speaking: repetition/shadowing results must be reported as such and
 *   never merged into free-speaking ability (spec §15).
 * - Listening ladder: phoneme discrimination -> word -> sentence ->
 *   dictation/shadowing -> normal/fast/connected/reduced speech ->
 *   real-world media (spec §14).
 * - Reading ladder with fading translation dependence + strategy training
 *   (skimming, scanning, inference, unknown-word handling) (spec §16).
 * - Writing ladder: word -> sentence -> paragraph -> chat/message/email
 *   -> explanation/argument/article, with naturalness & register feedback
 *   (spec §17).
 *
 * PHASE 0: interfaces only - no implementation.
 */

export interface Exercise {
  id: string;
  skill:
    | "grammar"
    | "listening"
    | "speaking"
    | "reading"
    | "writing";
  promptZh?: string;
  promptEn: string;
  /** Structured payload interpreted by the exercise renderer. */
  body: Record<string, unknown>;
  relatedItemIds: string[];
}

export interface IGrammarEngine {
  listCoreTopics(): Promise<Array<{ id: string; titleZh: string; stage: string }>>;
  generatePractice(topicId: string): Promise<Exercise[]>;
}

export interface IListeningEngine {
  getLadderLevel(): Promise<
    "phoneme" | "word" | "sentence" | "dictation" | "shadowing" | "connected-speech" | "real-media"
  >;
  generatePractice(level?: string): Promise<Exercise[]>;
}

export interface ISpeakingEngine {
  generatePractice(mode: "repeat" | "shadowing" | "guided" | "free"): Promise<Exercise[]>;
}

export interface IReadingEngine {
  getText(minLengthWords: number): Promise<{ id: string; paragraphs: string[] }>;
  generateComprehension(textId: string): Promise<Exercise[]>;
}

export interface IWritingEngine {
  createPrompt(kind: "sentence" | "paragraph" | "message" | "email" | "argument"): Promise<Exercise>;
  /** Local rule-based check; AI naturalness review is optional enhancement. */
  draftFeedback(draft: string): Promise<{ issuesZh: string[] }>;
}
