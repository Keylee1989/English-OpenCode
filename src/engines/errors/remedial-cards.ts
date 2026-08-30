/**
 * Error -> SRS auto-loop (Phase 3b).
 * Repeated errors become deduplicated remedial memory items that enter the
 * normal SRS due queue and future reviews.
 */
import { db } from "@/data/db";
import { detectRepeatedErrors } from "@/engines/errors/error-analysis-v0";
import { introduceItem } from "@/engines/memory/memory-engine-v0";
import { findLexical } from "@/content/vocab";
import type { Exercise } from "@/study/exercise-types";

export type RemedialType = "vocabulary" | "grammar" | "phonics" | "sentence-pattern";

export interface RemedialMemoryItem {
  id: string;
  sourceErrorId: string;
  knowledgeId: string;
  type: RemedialType;
  prompt: string;
  answer: string;
  explanationZh: string;
  difficulty: number;
  createdAt: number;
}

export function remedialCardId(knowledgeId: string, errorType: string): string {
  return `r:${errorType}:${knowledgeId.replace(/^w:/, "")}`.toLowerCase();
}

export async function syncRemedialCards(nowMs: number = Date.now()): Promise<string[]> {
  const errors = await db.errors.toArray();
  const groups = await detectRepeatedErrors(2);
  const created: string[] = [];

  for (const group of groups) {
    const mine = errors.filter(
      (row) =>
        row.category === group.category && row.relatedItemIds[0] === group.itemId,
    );
    if (mine.length === 0) continue;

    const errorType = (mine[0].errorType ?? "recall-failure") as string;
    const grammarNodeId =
      mine[0].relatedKnowledge?.find((id) => id.startsWith("g:")) ?? null;

    const knowledgeId = grammarNodeId ?? group.itemId;
    const id = remedialCardId(knowledgeId, errorType);

    // Merge rule: one card per knowledge+errorType.
    const existing = await db.knowledgeItems.get(id);
    if (existing) continue;

    const wordEntry = findLexical(group.itemId);
    let item: RemedialMemoryItem;

    if (grammarNodeId) {
      item = {
        id,
        sourceErrorId: mine[0].id,
        knowledgeId,
        type: "grammar",
        prompt: `句型纠正：把错误说法改成正确表达（关联：${grammarNodeId}）`,
        answer: mine[0].descriptionZh.includes("very")
          ? "I like it very much."
          : wordEntry?.word ?? "",
        explanationZh: mine[0].possibleCauseZh ?? mine[0].descriptionZh,
        difficulty: 0.45,
        createdAt: nowMs,
      };
    } else if (errorType === "phonics-confusion") {
      item = {
        id,
        sourceErrorId: mine[0].id,
        knowledgeId,
        type: "phonics",
        prompt: `听辨易混词，重点复习：${wordEntry?.word ?? group.itemId}`,
        answer: wordEntry?.word ?? "",
        explanationZh: mine[0].possibleCauseZh ?? "最小对立听辨不足。",
        difficulty: 0.4,
        createdAt: nowMs,
      };
    } else {
      item = {
        id,
        sourceErrorId: mine[0].id,
        knowledgeId,
        type: "vocabulary",
        prompt: `${wordEntry?.zh ?? "词汇"} 的英文是？（主动回忆）`,
        answer: wordEntry?.word ?? "",
        explanationZh:
          `${wordEntry?.word ?? ""} ${wordEntry?.ipa ?? ""} — ` +
          (mine[0].recommendedPracticeZh ?? "主动回忆巩固。"),
        difficulty: Math.min(0.9, (wordEntry?.difficulty ?? 0.3) + 0.15),
        createdAt: nowMs,
      };
    }

    await db.knowledgeItems.put({ id, kind: "remedial", data: item });
    await introduceItem(id, item.difficulty, nowMs);
    created.push(id);
  }

  return created;
}

export async function loadRemedialCard(itemId: string): Promise<RemedialMemoryItem | null> {
  const row = await db.knowledgeItems.get(itemId);
  if (!row || row.kind !== "remedial") return null;
  return row.data as RemedialMemoryItem;
}

export async function buildRemedialCardExercise(itemId: string): Promise<Exercise | null> {
  const card = await loadRemedialCard(itemId);
  if (!card || !card.answer) return null;
  return {
    id: `rev-${itemId.replace(/[^a-z0-9]/gi, "-")}`,
    type: "translate-zh-en",
    skill: "writing",
    itemId,
    promptZh: card.prompt,
    acceptedAnswers: [card.answer].filter((answer) => answer.length > 0),
    modelAnswer: card.answer,
    hintEn: card.explanationZh,
  };
}
