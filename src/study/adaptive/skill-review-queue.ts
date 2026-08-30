/**
 * Phase 21 — Skill Review Queue.
 *
 * Wraps the existing SRS due-queue into a skill-level review scheduler. The
 * SRS core (memory-engine-v0) is already item-agnostic and already ingests
 * non-vocabulary remedial cards (vocabulary/grammar/phonics/sentence-pattern).
 * What was missing is a skill-level VIEW, so the learner reviews "knowledge they
 * actually forgot" across skills, not just words.
 *
 * Additive only: this reads getDueCards + remedial-card registry + lexical
 * lookups; it does not modify the frozen SRS core.
 */
import { getDueCards, type DueCardView } from "@/engines/memory/memory-engine-v0";
import { loadRemedialCard } from "@/engines/errors/remedial-cards";
import { findLexical } from "@/content/vocab";
import type { SkillKey } from "@/core/types";

export interface QueuedReviewItem {
  itemId: string;
  skill: SkillKey;
  titleEn: string | null;
  promptZh: string;
  mode: string;
  lapses: number;
  difficulty: number;
}

export interface SkillQueueCount {
  skill: SkillKey;
  dueCount: number;
}

/**
 * Resolve a memory item id to a skill + title.
 * - r:vocab:*  -> vocabulary (remedial)
 * - r:grammar:*-> grammar (remedial)
 * - r:phonics:* -> phonics (remedial)
 * - r:sentence-pattern:* -> grammar
 * - otherwise lexical id (word) -> vocabulary
 */
export async function resolveItemSkill(itemId: string): Promise<{ skill: SkillKey; titleEn: string | null; promptZh: string }> {
  if (itemId.startsWith("r:")) {
    const card = await loadRemedialCard(itemId);
    if (card) {
      const skill: SkillKey =
        card.type === "phonics" ? "phonics"
        : card.type === "grammar" || card.type === "sentence-pattern" ? "grammar"
        : "vocabulary";
      return { skill, titleEn: card.answer ?? null, promptZh: card.prompt };
    }
    // Fallback by prefix.
    if (itemId.startsWith("r:phonics:")) return { skill: "phonics", titleEn: null, promptZh: "" };
    if (itemId.startsWith("r:grammar:")) return { skill: "grammar", titleEn: null, promptZh: "" };
    if (itemId.startsWith("r:vocab:") || itemId.startsWith("r:sentence-pattern:")) return { skill: "vocabulary", titleEn: null, promptZh: "" };
    return { skill: "vocabulary", titleEn: null, promptZh: "" };
  }
  const lex = findLexical(itemId);
  return {
    skill: "vocabulary",
    titleEn: lex?.word ?? null,
    promptZh: lex ? `${lex.zh ?? ""} 的英文是？` : "",
  };
}

export async function dueQueueBySkill(
  nowMs: number = Date.now(),
  limit = 120,
): Promise<{ items: QueuedReviewItem[]; counts: SkillQueueCount[]; totalDue: number }> {
  const cards: DueCardView[] = await getDueCards(nowMs, limit);
  const items: QueuedReviewItem[] = [];
  const counts = new Map<SkillKey, number>();

  for (const card of cards) {
    const { skill, titleEn, promptZh } = await resolveItemSkill(card.state.itemId);
    counts.set(skill, (counts.get(skill) ?? 0) + 1);
    items.push({
      itemId: card.state.itemId,
      skill,
      titleEn,
      promptZh,
      mode: card.suggestedModes[0] ?? "recognition",
      lapses: card.state.lapses,
      difficulty: card.state.difficulty,
    });
  }

  const order: SkillKey[] = ["listening", "speaking", "writing", "grammar", "phonics", "vocabulary", "reading"];
  const sorted: SkillQueueCount[] = [];
  for (const s of order) {
    const n = counts.get(s);
    if (n) sorted.push({ skill: s, dueCount: n });
  }
  for (const [skill, n] of counts) {
    if (!sorted.some((x) => x.skill === skill)) sorted.push({ skill: skill as SkillKey, dueCount: n });
  }

  return { items, counts: sorted, totalDue: items.length };
}

/** Count of due review items per skill (for the adaptive plan's review block). */
export async function dueSkillCount(
  nowMs: number = Date.now(),
): Promise<SkillQueueCount[]> {
  const { counts } = await dueQueueBySkill(nowMs, 120);
  return counts;
}
