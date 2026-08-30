/**
 * Content registry (Phase 1: Day 1-7 authored; Phase 2: 300+ word model).
 *
 * The 360-day target is the product goal, NOT the current content state.
 * Anything that asks for a day beyond AUTHORED_DAYS gets an explicit
 * "content not yet available" answer - never placeholder lessons.
 */
import { DAYS } from "@/content/days";
import {
  allLexical,
  findLexical,
  lexicalCount,
} from "@/content/vocab";
import type { DayContent } from "@/content/types";

export const COURSE_TARGET_DAYS = 360;
export const AUTHORED_DAYS = DAYS.length;

export const DAY_CONTENT: readonly DayContent[] = DAYS;

export function getDayContent(day: number): DayContent | null {
  if (!Number.isInteger(day) || day < 1 || day > AUTHORED_DAYS) return null;
  return DAYS[day - 1] ?? null;
}

export function listAuthoredDays(): DayContent[] {
  return [...DAYS];
}

// ---------------------------------------------------------------------------
// Vocabulary access - delegates to the Phase 2 merged lexical model.
// Kept as back-compatible names used by the exercise/SRS engines.
// ---------------------------------------------------------------------------

export function findVocab(idOrWord: string) {
  return findLexical(idOrWord);
}

/** Effective day vocabulary: new days reference ids; Day1-7 use inline entries. */
export function getDayVocabulary(dayContent: import("@/content/types").DayContent) {
  const ids =
    dayContent.vocabIds && dayContent.vocabIds.length > 0
      ? dayContent.vocabIds
      : dayContent.vocab.map((entry) => entry.id);
  return ids
    .map((id) => findLexical(id))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

export function allVocab() {
  return [...allLexical()];
}

export function allVocabIds(): string[] {
  return allLexical().map((entry) => entry.id);
}

export function vocabSize(): number {
  return lexicalCount();
}
