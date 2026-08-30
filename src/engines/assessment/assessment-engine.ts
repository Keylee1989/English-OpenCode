/**
 * Assessment Engine.
 *
 * Contract:
 * - Diagnostic + milestone assessments (Day 30/90/180/270/360) and the final
 *   proficiency assessment (spec §26-27).
 * - MUST include unseen material with increasing share at higher milestones;
 *   testing only learned content proves nothing about transfer.
 * - Covers listening / speaking / reading / writing, spontaneous production
 *   and real-world transfer tasks.
 * - Completion of curriculum does NOT equal graduation; only this engine's
 *   evidence does.
 *
 * PHASE 0: interface only - no implementation.
 */
import type { AssessmentResult } from "@/core/types";

export interface IAssessmentEngine {
  listResults(): Promise<AssessmentResult[]>;
  /** Build an assessment session; unseenShare in [0..1]. */
  createSession(kind: "diagnostic" | "milestone" | "final-proficiency"): Promise<{
    sessionId: string;
    unseenMaterialRatio: number;
  }>;
  submitSession(sessionId: string): Promise<AssessmentResult>;
}
