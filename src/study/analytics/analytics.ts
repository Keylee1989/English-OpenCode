/**
 * Phase 11-B Task 4: Learning Analytics - READ ONLY.
 *
 * Aggregates existing evidence tables (dailySessions / learningEvents /
 * memoryStates / errors / speakingAttempts / assessments / gamification)
 * into dashboard-friendly views. Nothing here writes to the database or
 * influences the study flow; it only makes behavior & outcomes observable.
 */
import { db, type LearningEventRow } from "@/data/db";

const DAY_MS = 86400000;

// ---------------------------------------------------------------------------
// Behavior stats (what the learner DID)
// ---------------------------------------------------------------------------

export interface DailyBehaviorPoint {
  dateISO: string;
  /** Minutes between session start/end (open sessions count up to now). */
  minutes: number;
  completedBlocks: number;
  xp: number;
}

export interface BehaviorSummary {
  days: DailyBehaviorPoint[];
  totalMinutes: number;
  totalXp: number;
  streakDays: number;
  bestStreakDays: number;
  activeDays: number;
  avgMinutesPerActiveDay: number;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Last N calendar days as ISO list, oldest first (today last). */
function lastNDates(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export async function getBehaviorSummary(windowDays = 30): Promise<BehaviorSummary> {
  const dates = lastNDates(windowDays);
  const sessions = await db.dailySessions.bulkGet(dates);
  const game = await db.gamification.get("main");
  const xpByDate = new Map<string, number>();
  for (const point of game?.dailyXp ?? []) xpByDate.set(point.dateISO, point.xp);

  const days: DailyBehaviorPoint[] = dates.map((dateISO) => {
    const session = sessions.find((row) => row?.dateISO === dateISO);
    const end = session ? (session.endedAt ?? Date.now()) : null;
    const minutes =
      session && end !== null ? Math.max(0, Math.round((end - session.startedAt) / 60000)) : 0;
    return {
      dateISO,
      minutes,
      completedBlocks: session?.completedBlocks.length ?? 0,
      xp: xpByDate.get(dateISO) ?? 0,
    };
  });

  const activeDays = days.filter((d) => d.completedBlocks > 0 || d.minutes > 0).length;
  const totalMinutes = days.reduce((sum, d) => sum + d.minutes, 0);

  return {
    days,
    totalMinutes,
    totalXp: days.reduce((sum, d) => sum + d.xp, 0),
    streakDays: game?.streakDays ?? 0,
    bestStreakDays: game?.bestStreakDays ?? 0,
    activeDays,
    avgMinutesPerActiveDay:
      activeDays === 0 ? 0 : Math.round(totalMinutes / activeDays),
  };
}

// ---------------------------------------------------------------------------
// Effectiveness stats (what the learner ACHIEVED)
// ---------------------------------------------------------------------------

export interface EffectivenessSummary {
  /** % of graded vocab reviews that succeeded across all memory states. */
  vocabularyRetentionPercent: number;
  gradedVocabItems: number;
  /** Total wrong answers recorded in the Error Bank. */
  errorTotal: number;
  errorTopCategories: Array<{ category: string; count: number }>;
  speakingAttemptCount: number;
  assessmentHistory: Array<{ day: number; overallScore: number; level: string; completedAt: number }>;
  /** Overall-score delta between the first and latest milestone assessment. */
  assessmentGrowthPoints: number | null;
  /**
   * Phase 12 P1-1: % of Error Bank entries (with a known item) whose item was
   * answered correctly on its latest post-error attempt.
   */
  errorImprovementRatePercent: number;
  errorsWithFollowUp: number;
}

export async function getEffectivenessSummary(): Promise<EffectivenessSummary> {
  const [memoryRows, errorRows, attemptCount, assessmentRows] = await Promise.all([
    db.memoryStates.toArray(),
    db.errors.toArray(),
    db.speakingAttempts.count(),
    db.assessments.orderBy("completedAt").toArray(),
  ]);

  let successes = 0;
  let failures = 0;
  let gradedItems = 0;
  for (const row of memoryRows) {
    if (row.successCount + row.failureCount === 0) continue;
    successes += row.successCount;
    failures += row.failureCount;
    gradedItems += 1;
  }
  const retentionPercent =
    successes + failures === 0
      ? 0
      : Math.round((successes / (successes + failures)) * 100);

  const byCategory = new Map<string, number>();
  for (const row of errorRows) {
    byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + 1);
  }
  const errorTopCategories = [...byCategory.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const history = assessmentRows.map((row) => ({
    day: row.day,
    overallScore: row.overallScore,
    level: row.level,
    completedAt: row.completedAt,
  }));
  const growth =
    history.length >= 2
      ? history[history.length - 1].overallScore - history[0].overallScore
      : null;

  // Phase 12 P1-1: did the learner fix what the Error Bank recorded?
  // For each error with a known item, check its LATEST graded attempt AFTER
  // the mistake; improvement = that attempt was correct.
  let errorsWithFollowUp = 0;
  let errorsImproved = 0;
  const checkedItems = new Map<string, LearningEventRow[]>();
  for (const error of errorRows) {
    const itemId = error.relatedItemIds[0];
    if (!itemId) continue;
    if (!checkedItems.has(itemId)) {
      checkedItems.set(
        itemId,
        await db.learningEvents.where("itemId").equals(itemId).sortBy("occurredAt"),
      );
    }
    const later = (checkedItems.get(itemId) ?? []).filter(
      (event) =>
        event.occurredAt > error.occurredAt &&
        event.itemId === itemId &&
        event.correct !== null,
    );
    if (later.length === 0) continue;
    errorsWithFollowUp += 1;
    if (later[later.length - 1].correct === true) errorsImproved += 1;
  }

  return {
    vocabularyRetentionPercent: retentionPercent,
    gradedVocabItems: gradedItems,
    errorTotal: errorRows.length,
    errorTopCategories,
    speakingAttemptCount: attemptCount,
    assessmentHistory: history,
    assessmentGrowthPoints: growth,
    errorImprovementRatePercent:
      errorsWithFollowUp === 0
        ? 0
        : Math.round((errorsImproved / errorsWithFollowUp) * 100),
    errorsWithFollowUp,
  };
}

/**
 * Phase 12 P1-1: curriculum-day completion curve.
 * percent per curriculum day: completed=100, lesson done only=50, not started=0.
 */
export interface CompletionCurvePoint {
  day: number;
  percent: number;
}

export async function getCompletionCurve(): Promise<CompletionCurvePoint[]> {
  const rows = await db.dayProgress.toArray();
  const byDay = new Map(rows.map((row) => [row.day, row]));
  const maxDay = rows.length === 0 ? 0 : Math.max(...rows.map((row) => row.day));
  const out: CompletionCurvePoint[] = [];
  for (let day = 1; day <= maxDay; day++) {
    const row = byDay.get(day);
    const percent =
      row?.status === "completed" ? 100 : row?.lessonDoneAt != null ? 50 : 0;
    out.push({ day, percent });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Phase 14 P0-2: first-week health (funnel view for the newest learners)
// ---------------------------------------------------------------------------

export interface FirstWeekHealth {
  day1CompletionPercent: number;
  day3RetentionPercent: number;
  day7RetentionPercent: number;
}

export async function getFirstWeekHealth(): Promise<FirstWeekHealth> {
  const rows = await db.dayProgress.toArray();
  const completed = new Set(rows.filter((row) => row.status === "completed").map((row) => row.day));
  const maxReached = rows.length === 0 ? 0 : Math.max(...rows.map((row) => row.day));
  const pct = (hit: boolean): number => (hit ? 100 : 0);
  return {
    day1CompletionPercent: pct(completed.has(1)),
    day3RetentionPercent: pct(maxReached >= 3),
    day7RetentionPercent: pct(maxReached >= 7),
  };
}

// ---------------------------------------------------------------------------
// Phase 14 P0-3: learning effectiveness report (READ ONLY)
// ---------------------------------------------------------------------------

const MASTERED_STAGES = new Set(["produced", "used", "mastered", "transferred"]);

export interface EffectivenessReport {
  vocabulary: {
    newWordsIntroduced: number;
    masteredWords: number;
    atRiskWords: number;
    retentionPercent: number;
  };
  speaking: {
    attemptCount: number;
    selfScoreAvgLast7Days: number | null;
    selfScoreAvgPrevious7Days: number | null;
  };
  writing: {
    errorBankCount: number;
    improvementRatePercent: number;
    improvedOfFollowUp: number;
  };
  assessments: Array<{ day: number; overallScore: number; level: string }>;
  assessmentSkillDelta: Array<{ skill: string; delta: number }>;
}

export async function getEffectivenessReport(now = Date.now()): Promise<EffectivenessReport> {
  const [memoryRows, eventRows, attemptRows, errorRows, assessmentRows] = await Promise.all([
    db.memoryStates.toArray(),
    db.learningEvents.toArray(),
    db.speakingAttempts.toArray(),
    db.errors.toArray(),
    db.assessments.orderBy("completedAt").toArray(),
  ]);

  // Vocabulary
  let masteredWords = 0;
  for (const row of memoryRows) {
    if (MASTERED_STAGES.has(row.stage)) masteredWords += 1;
  }
  const newWordsIntroduced = eventRows.filter((e) => e.interaction === "learn-new").length;
  const graded = memoryRows.filter((row) => row.successCount + row.failureCount > 0);
  const retentionPercent =
    graded.length === 0
      ? 0
      : Math.round(
          (graded.reduce((sum, row) => sum + row.successCount, 0) /
            graded.reduce((sum, row) => sum + row.successCount + row.failureCount, 0)) *
            100,
        );
  const atRiskWords = memoryRows.filter(
    (row) => row.lapses > 0 || row.difficulty > 0.6,
  ).length;

  // Speaking self-score trend: last 7 days vs the 7 before that.
  const weekStart = now - 7 * DAY_MS;
  const prevStart = now - 14 * DAY_MS;
  const avgSelf = (from: number, to: number): number | null => {
    const scores = attemptRows
      .filter((row) => row.createdAt >= from && row.createdAt < to)
      .map((row) => row.selfScore)
      .filter((score): score is number => typeof score === "number");
    if (scores.length === 0) return null;
    return Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10) / 10;
  };

  // Writing: Error Bank entries in the writing skill + their improvement.
  const writingErrors = errorRows.filter((row) => row.skill === "writing");
  let writingFollowUp = 0;
  let writingImproved = 0;
  for (const error of writingErrors) {
    const itemId = error.relatedItemIds[0];
    if (!itemId) continue;
    const events = await db.learningEvents
      .where("itemId")
      .equals(itemId)
      .sortBy("occurredAt");
    const later = events.filter(
      (event) => event.occurredAt > error.occurredAt && event.correct !== null,
    );
    if (later.length === 0) continue;
    writingFollowUp += 1;
    if (later[later.length - 1].correct === true) writingImproved += 1;
  }

  const history = assessmentRows.map((row) => ({
    day: row.day,
    overallScore: row.overallScore,
    level: row.level,
    data: (row.data ?? {}) as { skillScores?: Record<string, number> },
  }));
  const first = history[0];
  const last = history[history.length - 1];
  const skillDelta: Array<{ skill: string; delta: number }> = [];
  if (first && last) {
    const skills = new Set([
      ...Object.keys(first.data.skillScores ?? {}),
      ...Object.keys(last.data.skillScores ?? {}),
    ]);
    for (const skill of skills) {
      const a = first.data.skillScores?.[skill];
      const b = last.data.skillScores?.[skill];
      if (typeof a === "number" && typeof b === "number") {
        skillDelta.push({ skill, delta: b - a });
      }
    }
  }

  return {
    vocabulary: {
      newWordsIntroduced,
      masteredWords,
      atRiskWords,
      retentionPercent,
    },
    speaking: {
      attemptCount: attemptRows.length,
      selfScoreAvgLast7Days: avgSelf(weekStart, now + 1),
      selfScoreAvgPrevious7Days: avgSelf(prevStart, weekStart),
    },
    writing: {
      errorBankCount: writingErrors.length,
      improvementRatePercent:
        writingFollowUp === 0
          ? 0
          : Math.round((writingImproved / writingFollowUp) * 100),
      improvedOfFollowUp: writingFollowUp,
    },
    assessments: history.map(({ day, overallScore, level }) => ({ day, overallScore, level })),
    assessmentSkillDelta: skillDelta,
  };
}

/** Convenience bundle used by the dashboard page. */
export interface AnalyticsBundle {
  generatedAt: number;
  todayISO: string;
  behavior: BehaviorSummary;
  effectiveness: EffectivenessSummary;
  /** Phase 12 P1-1: per-curriculum-day completion curve. */
  completionCurve: CompletionCurvePoint[];
}

export async function getAnalyticsBundle(windowDays = 30): Promise<AnalyticsBundle> {
  const [behavior, effectiveness, completionCurve] = await Promise.all([
    getBehaviorSummary(windowDays),
    getEffectivenessSummary(),
    getCompletionCurve(),
  ]);
  return {
    generatedAt: Date.now(),
    todayISO: todayISO(),
    behavior,
    effectiveness,
    completionCurve,
  };
}

// ---------------------------------------------------------------------------
// Phase 13 P1-2: SRS memory health (READ ONLY)
// ---------------------------------------------------------------------------

export interface MemoryHealth {
  /** Items whose due date has passed and are still waiting for review. */
  dueNotReviewed: number;
  /** Of items that came due in the last 7 days, % already reviewed. */
  reviewCompletionRatePercent: number;
  dueInLast7Days: number;
  /** Items with lapses or high difficulty - the forget-risk pool. */
  atRiskCount: number;
  totalTrackedItems: number;
}

export async function getMemoryHealth(now = Date.now()): Promise<MemoryHealth> {
  const rows = await db.memoryStates.toArray();
  const weekAgo = now - 7 * DAY_MS;
  let dueNotReviewed = 0;
  let dueInLast7Days = 0;
  let reviewedOfDue = 0;
  let atRiskCount = 0;
  let totalTrackedItems = 0;
  for (const row of rows) {
    if (row.stage === "unseen") continue;
    totalTrackedItems += 1;
    const isOverdue = row.dueAt <= now;
    const reviewedSinceDue = row.lastReviewedAt !== null && row.lastReviewedAt >= row.dueAt;
    if (isOverdue && !reviewedSinceDue) dueNotReviewed += 1;
    if (row.dueAt <= now && row.dueAt >= weekAgo) {
      dueInLast7Days += 1;
      if (reviewedSinceDue) {
        reviewedOfDue += 1;
      }
    }
    if (row.lapses > 0 || row.difficulty > 0.6) atRiskCount += 1;
  }
  return {
    dueNotReviewed,
    reviewCompletionRatePercent:
      dueInLast7Days === 0 ? 100 : Math.round((reviewedOfDue / dueInLast7Days) * 100),
    dueInLast7Days,
    atRiskCount,
    totalTrackedItems,
  };
}

// ---------------------------------------------------------------------------
// Phase 13 P1-1: weekly learning report (READ ONLY)
// ---------------------------------------------------------------------------

export interface WeeklyReportData {
  startISO: string;
  endISO: string;
  minutes: number;
  activeDays: number;
  lessonsCompleted: number;
  newWordsIntroduced: number;
  wordsReviewed: number;
  aiInteractions: number;
  errorsRecorded: number;
}

export async function getWeeklyReport(now = Date.now()): Promise<WeeklyReportData> {
  const windowStart = now - 7 * DAY_MS;
  const dates = lastNDates(7);
  const sessions = await db.dailySessions.bulkGet(dates);
  const [events, progressRows, usageRow, errorRows] = await Promise.all([
    db.learningEvents.where("occurredAt").aboveOrEqual(windowStart).toArray(),
    // dayProgress has no completedAt index; the table is tiny (<180 rows).
    db.dayProgress
      .filter((row) => row.completedAt !== null && row.completedAt > windowStart)
      .count(),
    db.settings.get("ai-usage-log"),
    db.errors.where("occurredAt").aboveOrEqual(windowStart).toArray(),
  ]);

  const minutes = sessions.reduce((sum, s) => {
    if (!s) return sum;
    const end = s.endedAt ?? now;
    return sum + Math.max(0, Math.round((end - s.startedAt) / 60000));
  }, 0);

  const usageValue = (usageRow?.value ?? []) as Array<{ timestamp?: number }>;
  const aiInteractions = usageValue.filter(
    (rec) => typeof rec.timestamp === "number" && rec.timestamp >= windowStart,
  ).length;

  let newWordsIntroduced = 0;
  let wordsReviewed = 0;
  for (const event of events) {
    if (event.interaction === "learn-new") newWordsIntroduced += 1;
    else if (event.meta?.isReview === true || String(event.interaction).includes("review")) {
      wordsReviewed += 1;
    }
  }

  return {
    startISO: dates[0],
    endISO: dates[dates.length - 1],
    minutes,
    activeDays: sessions.filter((s) => s).length,
    lessonsCompleted: progressRows,
    newWordsIntroduced,
    wordsReviewed,
    aiInteractions,
    errorsRecorded: errorRows.length,
  };
}
