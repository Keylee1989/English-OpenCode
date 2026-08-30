import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import { getWeeklyReport } from "@/study/analytics/analytics";

/**
 * Phase 13 P1-1: weekly learning report aggregation.
 * Seeds a controlled 7-day window and asserts every metric.
 */

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

describe("Weekly learning report (Phase 13 P1-1)", () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it("aggregates minutes / lessons / words / AI interactions over 7 days", async () => {
    const now = Date.now();
    // Two active sessions inside the window (today + 2 days ago).
    await db.dailySessions.bulkPut([
      {
        dateISO: daysAgoISO(0),
        startedAt: now - 3600000,
        endedAt: now,
        dayStartAbilities: {},
        completedBlocks: ["lesson-a", "practice-a"],
        assessmentScore: null,
      },
      {
        dateISO: daysAgoISO(2),
        startedAt: now - 3 * 3600000,
        endedAt: now - 2 * 3600000,
        dayStartAbilities: {},
        completedBlocks: ["review"],
        assessmentScore: null,
      },
    ]);
    await db.dayProgress.put({
      day: 151,
      status: "completed",
      startedAt: now - 86400000,
      lessonDoneAt: now - 80000000,
      completedAt: now - 40000000,
      score: 91,
    });
    const recentEvent = (i: number, interaction: string, isReview?: boolean) => ({
      id: `e${i}`,
      occurredAt: now - i * 60000,
      skill: "vocabulary",
      interaction,
      correct: true,
      meta: isReview ? { isReview: true } : undefined,
    });
    await db.learningEvents.bulkAdd([
      recentEvent(10, "learn-new"),
      recentEvent(9, "learn-new"),
      recentEvent(8, "learn-new"),
      recentEvent(7, "recall", true),
      recentEvent(6, "multiple-choice", true),
    ]);
    await db.settings.put({
      key: "ai-usage-log",
      value: [
        { id: "u1", provider: "p", model: "m", timestamp: now - 100000, feature: "explanation", ok: true },
        { id: "u2", provider: "p", model: "m", timestamp: now - 50000, feature: "roleplay", ok: false },
        // Outside the window: must be excluded.
        { id: "u3", provider: "p", model: "m", timestamp: now - 30 * 86400000, feature: "chat", ok: true },
      ],
    });
    await db.errors.bulkAdd([
      {
        id: "err-week",
        occurredAt: now - 1000,
        skill: "grammar",
        category: "grammar-mistake",
        descriptionZh: "x",
        severity: "low",
        relatedItemIds: [],
        resolvedAt: null,
      },
      // Old error outside the window.
      {
        id: "err-old",
        occurredAt: now - 40 * 86400000,
        skill: "grammar",
        category: "old",
        descriptionZh: "y",
        severity: "low",
        relatedItemIds: [],
        resolvedAt: null,
      },
    ]);

    const report = await getWeeklyReport(now);
    expect(report.activeDays).toBe(2);
    expect(report.minutes).toBeGreaterThanOrEqual(60); // 60 + 60
    expect(report.lessonsCompleted).toBe(1);
    expect(report.newWordsIntroduced).toBe(3);
    expect(report.wordsReviewed).toBe(2);
    expect(report.aiInteractions).toBe(2); // old entry excluded
    expect(report.errorsRecorded).toBe(1); // old error excluded
  });

  it("returns zeros for an empty week without throwing", async () => {
    const report = await getWeeklyReport();
    expect(report.minutes).toBe(0);
    expect(report.activeDays).toBe(0);
    expect(report.lessonsCompleted).toBe(0);
    expect(report.newWordsIntroduced).toBe(0);
    expect(report.wordsReviewed).toBe(0);
    expect(report.aiInteractions).toBe(0);
    expect(report.errorsRecorded).toBe(0);
  });

  it("spans exactly the last seven calendar dates", async () => {
    const report = await getWeeklyReport();
    const start = new Date(report.startISO + "T00:00:00Z").getTime();
    const end = new Date(report.endISO + "T00:00:00Z").getTime();
    expect(Math.round((end - start) / 86400000)).toBe(6);
  });
});
