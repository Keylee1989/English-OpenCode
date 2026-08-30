/**
 * Speaking attempt storage (Phase 6, Task 4 - basic voice support).
 *
 * A speaking attempt = the learner's recording for one AI line in a roleplay
 * conversation, plus a MANDATORY self-score. The system deliberately does NOT
 * auto-grade pronunciation (no fake scoring); evidence flows to the Student
 * Model only through explicit self-assessment events recorded by the caller.
 */
import { db, type SpeakingAttemptRow } from "@/data/db";
import { newId } from "@/core/ids";

export interface SaveAttemptInput {
  conversationId: string;
  promptEn: string;
  audio: Blob;
  selfScore?: number | null;
  note?: string;
}

export async function saveAttempt(input: SaveAttemptInput): Promise<SpeakingAttemptRow> {
  const row: SpeakingAttemptRow = {
    id: newId(),
    conversationId: input.conversationId,
    promptEn: input.promptEn,
    audio: input.audio,
    createdAt: Date.now(),
    selfScore: clampScore(input.selfScore ?? null),
    note: input.note,
  };
  await db.speakingAttempts.put(row);
  return row;
}

function clampScore(score: number | null): number | null {
  if (score === null || score === undefined) return null;
  return Math.min(5, Math.max(1, Math.round(score)));
}

export async function listAttempts(conversationId: string): Promise<SpeakingAttemptRow[]> {
  return db.speakingAttempts
    .where("conversationId")
    .equals(conversationId)
    .reverse()
    .sortBy("createdAt");
}

export async function getAttempt(id: string): Promise<SpeakingAttemptRow | null> {
  return (await db.speakingAttempts.get(id)) ?? null;
}

/** Attach or revise the learner's self-score / note after listening back. */
export async function setSelfReview(
  id: string,
  selfScore: number,
  note?: string,
): Promise<void> {
  const row = await db.speakingAttempts.get(id);
  if (!row) return;
  row.selfScore = clampScore(selfScore);
  if (note !== undefined) row.note = note;
  await db.speakingAttempts.put(row);
}

export async function deleteAttempt(id: string): Promise<void> {
  await db.speakingAttempts.delete(id);
}

export async function deleteAttemptsForConversation(conversationId: string): Promise<number> {
  const rows = await db.speakingAttempts.where("conversationId").equals(conversationId).toArray();
  for (const row of rows) await db.speakingAttempts.delete(row.id);
  return rows.length;
}
