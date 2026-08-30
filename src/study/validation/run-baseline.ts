/**
 * High-level runner that ties the banks, adaptive session planner, and the
 * baseline model together. Keeping the orchestration pure here makes the UI
 * thin and the end-to-end flow unit-testable.
 */
import type { Probe } from "./banks/types";
import { planSkill } from "./session";
import { grammarBankForBand } from "./banks/grammar-bank";
import { readingBankForBand } from "./banks/reading-bank";
import { listeningBankForBand } from "./banks/listening-bank";
import { speakingBankForBand } from "./banks/speaking-bank";
import { writingBankForBand } from "./banks/writing-bank";
import { vocabRecognitionProbes, vocabRecallProbe, vocabCollocationProbe, vocabCandidatesForBand } from "./banks/vocab-bank";
import type { SkillKey } from "@/core/types";

export interface SkillRound {
  skill: SkillKey;
  probes: Probe[];
}

export const SKILL_ROUND_SIZE = { vocabulary: 8, grammar: 6, reading: 6, listening: 6, speaking: 4, writing: 4 } as const;

export const SKILL_LABELS_ZH: Record<SkillKey, string> = {
  vocabulary: "词汇",
  grammar: "语法",
  reading: "阅读",
  listening: "听力",
  speaking: "口语",
  writing: "写作",
  phonics: "语音",
  pronunciation: "发音",
};

/** Bank sources for the six assessed skills. */
function bankFor(skill: SkillKey): (band: Parameters<typeof grammarBankForBand>[0], seed: number) => Probe[] {
  switch (skill) {
    case "grammar":
      return grammarBankForBand;
    case "reading":
      return readingBankForBand;
    case "listening":
      return listeningBankForBand;
    case "speaking":
      return speakingBankForBand;
    case "writing":
      return writingBankForBand;
    case "vocabulary":
      return vocabBankForBand;
    default:
      return () => [];
  }
}

/**
 * Vocabulary bank: programmatic, mixing recognition (default) with recall and
 * collocation probes so the round samples receptive AND productive knowledge.
 */
function vocabBankForBand(band: Parameters<typeof grammarBankForBand>[0], seed: number): Probe[] {
  const base = vocabRecognitionProbes(band, 6, seed);
  const cands = vocabCandidatesForBand(band, seed + 999);
  const out: Probe[] = base.slice(0, 4);
  if (cands[0]) out.push(vocabRecallProbe(cands[0]));
  if (cands[1]) out.push(vocabCollocationProbe(cands[1], seed));
  return out;
}

/**
 * Build all skill rounds for a baseline session (deterministic per seed).
 * Returns the ordered rounds and the set of probe ids used across them.
 */
export function buildAllRounds(seed: number): { rounds: SkillRound[]; usedIds: Set<string> } {
  const usedIds = new Set<string>();
  const rounds: SkillRound[] = [];
  for (const skill of ["vocabulary", "grammar", "reading", "listening", "speaking", "writing"] as SkillKey[]) {
    const size = SKILL_ROUND_SIZE[skill as keyof typeof SKILL_ROUND_SIZE] ?? 6;
    const plan = planSkill(skill, bankFor(skill), size, seed, usedIds);
    rounds.push({ skill, probes: plan.probes });
  }
  return { rounds, usedIds };
}
