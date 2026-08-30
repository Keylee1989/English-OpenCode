/**
 * Study session helpers - bridges the UI flow to persistence.
 * One dailySessions row per calendar day; dayProgress rows per curriculum day.
 */
import { db, type AbilityRow } from "@/data/db";
import { todayISO } from "@/engines/planner/planner-v0";
import { getAllAbilities } from "@/engines/student/student-model-v0";
import { awardXp, type XpEventKind } from "@/engines/gamification/gamification-v0";

export async function ensureDailySession(dateISO: string = todayISO()): Promise<void> {
  const existing = await db.dailySessions.get(dateISO);
  if (existing) return;
  const abilities = await getAllAbilities();
  const snapshot: Record<string, { score: number; confidence: number }> = {};
  for (const [skill, row] of Object.entries(abilities) as Array<[string, AbilityRow]>) {
    snapshot[skill] = { score: row.score, confidence: row.confidence };
  }
  await db.dailySessions.put({
    dateISO,
    startedAt: Date.now(),
    endedAt: null,
    dayStartAbilities: snapshot,
    completedBlocks: [],
    assessmentScore: null,
  });
}

export async function markBlockDone(blockId: string, dateISO: string = todayISO()): Promise<void> {
  await ensureDailySession(dateISO);
  const session = await db.dailySessions.get(dateISO);
  if (!session) return;
  if (!session.completedBlocks.includes(blockId)) {
    session.completedBlocks.push(blockId);
    await db.dailySessions.put(session);
    // Gamification v0: XP for real block completions only (never per question).
    const kind = xpKindForBlock(blockId);
    if (kind) {
      try {
        await awardXp(kind);
      } catch {
        // Gamification must never break the study flow.
      }
    }
  }
}

function xpKindForBlock(blockId: string): XpEventKind | null {
  if (blockId.startsWith("practice-")) return "practice";
  if (blockId.startsWith("assessment-")) return "assessment";
  if (blockId.startsWith("review")) return "review";
  if (blockId.startsWith("drill-")) return "drill";
  return null;
}

export async function finishDailySession(dateISO: string = todayISO()): Promise<void> {
  const session = await db.dailySessions.get(dateISO);
  if (!session || session.endedAt !== null) return;
  session.endedAt = Date.now();
  await db.dailySessions.put(session);
}

/** Called when a lesson block starts for a day (creates progress row). */
export async function startDay(day: number): Promise<void> {
  const existing = await db.dayProgress.get(day);
  if (existing) return;
  await db.dayProgress.put({
    day,
    status: "in-progress",
    startedAt: Date.now(),
    lessonDoneAt: null,
    completedAt: null,
    score: null,
  });
}

export async function markLessonDone(day: number): Promise<void> {
  const row = await db.dayProgress.get(day);
  if (!row) {
    await startDay(day);
  } else {
    if (row.lessonDoneAt === null) row.lessonDoneAt = Date.now();
    await db.dayProgress.put(row);
  }
  // Gamification v0: one XP grant per finished lesson (idempotent per call site).
  try {
    await awardXp("lesson");
  } catch {
    // never break the study flow
  }
}

export async function completeDay(day: number, score: number): Promise<void> {
  const now = Date.now();
  const existing = await db.dayProgress.get(day);
  await db.dayProgress.put({
    day,
    status: "completed",
    startedAt: existing?.startedAt ?? now,
    lessonDoneAt: existing?.lessonDoneAt ?? now,
    completedAt: now,
    score,
  });
}
