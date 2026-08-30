import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import {
  getEffectivenessReport,
  getFirstWeekHealth,
} from "@/study/analytics/analytics";

/**
 * Phase 14 P0-3: learning effectiveness report + first-week health.
 */
describe("Effectiveness report & first-week health (Phase 14)", () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it("aggregates vocabulary / speaking / writing dimensions", async () => {
    const now = Date.now();
    // Vocabulary: introduced + mastered + at-risk mix.
    await db.learningEvents.bulkAdd([
      { id: "e1", occurredAt: now - 1000, skill: "vocabulary", interaction: "learn-new", correct: null },
      { id: "e2", occurredAt: now - 900, skill: "vocabulary", interaction: "learn-new", correct: null },
      { id: "e3", occurredAt: now - 800, skill: "vocabulary", interaction: "learn-new", correct: null },
    ]);
    await db.memoryStates.bulkPut([
      {
        itemId: "w:m1",
        stage: "mastered",
        stability: 9,
        difficulty: 0.1,
        dueAt: now + 86400000,
        lastReviewedAt: now,
        successfulReps: 6,
        lapses: 0,
        reviewCount: 6,
        successCount: 6,
        failureCount: 0,
        producedCount: 2,
      },
      {
        itemId: "w:r1",
        stage: "recalled",
        stability: 2,
        difficulty: 0.8,
        dueAt: now + 100000,
        lastReviewedAt: now,
        successfulReps: 2,
        lapses: 2,
        reviewCount: 4,
        successCount: 2,
        failureCount: 2,
        producedCount: 0,
      },
    ]);

    // Speaking attempts: last week avg 3.5, previous week avg 2.
    await db.speakingAttempts.bulkPut([
      { id: "a1", conversationId: "c", promptEn: "p", audio: new Blob([]), createdAt: now - 100000, selfScore: 4 },
      { id: "a2", conversationId: "c", promptEn: "p", audio: new Blob([]), createdAt: now - 200000, selfScore: 3 },
      { id: "a3", conversationId: "c", promptEn: "p", audio: new Blob([]), createdAt: now - 10 * 86400000, selfScore: 2 },
    ]);

    // Writing error with a later-corrected item.
    await db.errors.add({
      id: "w-err",
      occurredAt: now - 500000,
      skill: "writing",
      category: "writing-mistake",
      descriptionZh: "x",
      severity: "low",
      relatedItemIds: ["w:m1"],
      resolvedAt: null,
    });
    await db.learningEvents.add({
      id: "e-fix",
      occurredAt: now - 100,
      itemId: "w:m1",
      skill: "writing",
      interaction: "free-response",
      correct: true,
    });

    const report = await getEffectivenessReport(now);
    expect(report.vocabulary.newWordsIntroduced).toBe(3);
    expect(report.vocabulary.masteredWords).toBe(1);
    expect(report.vocabulary.atRiskWords).toBe(1);

    expect(report.speaking.attemptCount).toBe(3);
    expect(report.speaking.selfScoreAvgLast7Days).toBe(3.5);
    expect(report.speaking.selfScoreAvgPrevious7Days).toBe(2);

    expect(report.writing.errorBankCount).toBe(1);
    expect(report.writing.improvementRatePercent).toBe(100);
  });

  it("returns zeroed dimensions for a fresh learner", async () => {
    const report = await getEffectivenessReport();
    expect(report.vocabulary.newWordsIntroduced).toBe(0);
    expect(report.speaking.attemptCount).toBe(0);
    expect(report.speaking.selfScoreAvgLast7Days).toBeNull();
    expect(report.writing.errorBankCount).toBe(0);
    expect(report.assessments).toHaveLength(0);
    expect(report.assessmentSkillDelta).toHaveLength(0);
  });

  it("first-week health reflects real progress rows", async () => {
    await db.dayProgress.bulkPut([
      { day: 1, status: "completed", startedAt: 1, lessonDoneAt: 1, completedAt: 1, score: 80 },
      { day: 2, status: "completed", startedAt: 2, lessonDoneAt: 2, completedAt: 2, score: 75 },
      { day: 3, status: "completed", startedAt: 3, lessonDoneAt: 3, completedAt: 3, score: 78 },
      { day: 5, status: "in-progress", startedAt: 5, lessonDoneAt: null, completedAt: null, score: null },
    ]);
    const health = await getFirstWeekHealth();
    expect(health.day1CompletionPercent).toBe(100);
    expect(health.day3RetentionPercent).toBe(100);
    expect(health.day7RetentionPercent).toBe(0);
  });
});
