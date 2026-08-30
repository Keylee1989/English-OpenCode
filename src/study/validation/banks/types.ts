/**
 * Probe types for the Adaptive Learning Validation / Baseline System.
 *
 * A "probe" is a single assessment item with an intrinsic CEFR difficulty
 * band. The adaptive engine presents probes of varying bands to bracket a
 * learner's ability, then records correct/incorrect trials into the Elo
 * estimator (see adaptive.ts).
 *
 * Kinds span receptive and productive knowledge. Productive kinds (recall,
 * correction, spontaneous response, essay) are self-graded or AI-graded and so
 * always degrade honestly to a learner self-report when no AI is configured.
 */
import type { CefrLevel } from "@/study/validation/adaptive";
import type { SkillKey } from "@/core/types";

export type ProbeKind =
  | "vocab-recognition" // pick the Chinese meaning (receptive)
  | "vocab-recall" // type the English word from meaning (productive)
  | "vocab-collocation" // pick the natural collocation (productive, register-aware)
  | "grammar-choice" // pick the correct form (receptive)
  | "grammar-correction" // correct the error in the sentence (productive)
  | "reading-choice" // comprehension / inference MCQ (receptive)
  | "listening-dictation" // fill the missing word from a short transcript (receptive)
  | "speaking-opinion" // spontaneous/opinion spoken response (productive)
  | "writing-essay"; // structured written production (productive)

export interface Probe {
  /** Stable id, e.g. "grammar-B1-x". */
  id: string;
  skill: SkillKey;
  band: CefrLevel;
  kind: ProbeKind;
  /** True when answering requires active production (typing/speaking/writing). */
  productive: boolean;
  /** English question / instruction. */
  promptEn: string;
  /** Chinese instruction / context for a zero-base Chinese learner. */
  promptZh: string;
  /** Distractor + correct options for choice kinds. */
  options?: string[];
  /** Authoritative answer for auto-gradable kinds. */
  key?: string;
  /** Post-answer explanation (Chinese). */
  tipZh?: string;
  /** Source ids in the content library, if reused (e.g. a reading article). */
  refs?: string[];
}

export type ProbeAnswer = { correct: boolean; answerText: string };

export function isChoiceKind(kind: ProbeKind): boolean {
  return (
    kind === "vocab-recognition" ||
    kind === "vocab-collocation" ||
    kind === "grammar-choice" ||
    kind === "reading-choice"
  );
}

export function probeIsProductive(p: Probe): boolean {
  return (
    p.kind === "vocab-recall" ||
    p.kind === "grammar-correction" ||
    p.kind === "speaking-opinion" ||
    p.kind === "writing-essay"
  );
}
