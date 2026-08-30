/**
 * Real-world English + AI Tutor + AI Conversation engines.
 *
 * Real-world English (spec §18-19): American English by default; every
 * expression carries register metadata (standard/spoken/formal/informal/
 * internet/slang/professional) and answers: correct? natural? when to use?
 *
 * AI Tutor / Conversation (spec §28): enhancement layer ONLY. The system
 * must remain fully functional offline; these engines report availability
 * and degrade explicitly.
 *
 * PHASE 0: interfaces only - no implementation, no network calls.
 */
import type { Exercise } from "@/engines/skills/skill-engines";

export type Register =
  | "standard"
  | "american-spoken"
  | "formal"
  | "informal"
  | "internet"
  | "slang"
  | "professional";

export interface IRealWorldEnglishEngine {
  listScenarios(): Promise<Array<{ id: string; titleZh: string }>>;
  getScenarioDialogue(scenarioId: string): Promise<Exercise[]>;
}

export interface IAiTutorEngine {
  /** Ask for an explanation in Chinese scaffolded to current level. */
  explain(questionZh: string, contextItemIds?: string[]): Promise<{ answerZh: string }>;
}

export interface IAiConversationEngine {
  startRoleplay(scenarioId: string): Promise<{ sessionId: string }>;
  sendUserTurn(sessionId: string, utteranceEn: string): Promise<{
    replyEn: string;
    correctionsZh: string[];
  }>;
}
