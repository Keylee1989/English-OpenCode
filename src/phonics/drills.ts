/**
 * Phonics drills - minimal-pair listening discrimination exercises.
 * Deterministic per pair id: same pair always drills the same target word.
 */
import { hashString, mulberry32 } from "@/core/rng";
import { findPair } from "@/phonics/rules";
import type { PhonicsDiscriminationExercise } from "@/study/exercise-types";
import { findLexical } from "@/content/vocab";

export function buildDiscriminationDrill(
  pairId: string,
): PhonicsDiscriminationExercise | null {
  const pair = findPair(pairId);
  if (!pair) return null;
  // Honest guard: both endpoint words must exist in the vocabulary model.
  if (!findLexical(pair.aWord) || !findLexical(pair.bWord)) return null;

  const rand = mulberry32(hashString(pairId));
  const targetIsA = rand() < 0.5;
  const targetWord = targetIsA ? pair.aWord : pair.bWord;
  const optionsEn = [pair.aWord, pair.bWord] as [string, string];
  const answerIndex = targetIsA ? 0 : 1;

  return {
    id: `pd-${pairId}`,
    type: "phonics-discriminate",
    skill: "listening",
    requiresAudio: true,
    pairId,
    targetWord,
    speakText: targetWord,
    optionsEn,
    answerIndex,
    tipZh: pair.contrastZh,
  };
}

export function buildPhonicsDrills(pairIds: readonly string[], limit = 4): PhonicsDiscriminationExercise[] {
  const drills: PhonicsDiscriminationExercise[] = [];
  for (const pairId of pairIds) {
    if (drills.length >= limit) break;
    const drill = buildDiscriminationDrill(pairId);
    if (drill) drills.push(drill);
  }
  return drills;
}
