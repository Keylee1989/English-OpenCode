import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import {
  computeCohortCompletion,
  computeCohortRetention,
  computeDifficultyRatios,
  getCohortReport,
  type UserHistory,
} from "@/study/beta/cohort";

function history(
  cohortDateISO: string,
  activeDatesISO: string[],
  overrides: Partial<UserHistory> = {},
): UserHistory {
  return {
    cohortDateISO,
    activeDatesISO: new Set(activeDatesISO),
    daysCompleted: 0,
    minutesTotal: 0,
    errorCount: 0,
    aiCallCount: 0,
    ...overrides,
  };
}

describe("Cohort analytics (Phase 13 P0-1)", () => {
  let seedCounter = 1;
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((table) => table.clear()));
    seedCounter = 1;
  });

  it("computes classic Dn retention across multiple users", () => {
    const histories = [
      // Active exactly on D1 and D3.
      history("2026-08-01", ["2026-08-01", "2026-08-02", "2026-08-04"]),
      // Dropped after start day: only D0 activity.
      history("2026-08-01", ["2026-08-01"]),
      // Long-term learner: still active at D30.
      history("2026-07-10", ["2026-07-10", "2026-08-09", "2026-08-25"]),
    ];
    const retention = computeCohortRetention(histories);
    // u1: active 08-01/02/04 -> retains through D3; u2: only start day; u3: long-term.
    expect(retention.d1).toBe(67); // u1 + u3
    expect(retention.d3).toBe(67); // u1 + u3
    expect(retention.d7).toBe(33); // u3 only
    expect(retention.d30).toBe(33); // u3 only
  });

  it("returns zeros for empty histories without throwing", () => {
    const retention = computeCohortRetention([]);
    expect(retention.d30).toBe(0);
    const completion = computeCohortCompletion([]);
    expect(completion.avgCompletedDay).toBe(0);
  });

  it("averages completion metrics over users", () => {
    const completion = computeCohortCompletion([
      history("2026-08-01", ["2026-08-01"], { daysCompleted: 4, minutesTotal: 120, errorCount: 8, aiCallCount: 3 }),
      history("2026-08-02", ["2026-08-02"], { daysCompleted: 2, minutesTotal: 60, errorCount: 4, aiCallCount: 1 }),
    ]);
    expect(completion.avgCompletedDay).toBe(3);
    expect(completion.avgMinutes).toBe(90);
    expect(completion.avgErrors).toBe(6);
    expect(completion.avgAiCalls).toBe(2);
  });

  it("groups difficulty ratios by day and by skill", () => {
    const ratings = [
      { rating: "偏难" as const, day: 12, skill: "listening" },
      { rating: "偏难" as const, day: 12, skill: "grammar" },
      { rating: "偏易" as const, day: 13, skill: "listening" },
      { rating: "适中" as const, day: 14 },
    ];
    const byDay = computeDifficultyRatios(ratings, "day");
    const day12 = byDay.find((row) => row.key === "Day 12");
    expect(day12?.total).toBe(2);
    expect(day12?.hardPercent).toBe(100);

    const bySkill = computeDifficultyRatios(ratings, "skill");
    const listening = bySkill.find((row) => row.key === "listening");
    expect(listening?.easyPercent).toBe(50);
    expect(listening?.hardPercent).toBe(50);
    // Items without a skill are skipped in the skill dimension.
    expect(bySkill.find((row) => row.key === "")).toBeUndefined();
  });

  it("builds the local cohort report from real tables", async () => {
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    await db.dailySessions.put({
      dateISO: iso,
      startedAt: Date.now() - 600000,
      endedAt: Date.now(),
      dayStartAbilities: {},
      completedBlocks: ["lesson-151"],
      assessmentScore: null,
    });
    await db.dayProgress.bulkPut([
      { day: 151, status: "completed", startedAt: 1, lessonDoneAt: 1, completedAt: 1, score: 88 },
    ]);
    await db.errors.add({
      id: "e1",
      occurredAt: Date.now(),
      skill: "grammar",
      category: "test",
      descriptionZh: "x",
      severity: "low",
      relatedItemIds: [],
      resolvedAt: null,
    });
    await db.settings.put({
      key: "ai-usage-log",
      value: [{ id: "u1", provider: "p", model: "m", timestamp: 1, feature: "chat", ok: true }],
    });

    const report = await getCohortReport();
    expect(report.users).toBe(1);
    expect(report.cohortDateISO).toBe(iso);
    expect(report.completion.avgCompletedDay).toBe(1);
    expect(report.completion.avgErrors).toBe(1);
    expect(report.completion.avgAiCalls).toBe(1);
    expect(report.difficultyOverall).toBeNull(); // no feedback logged yet
    void seedCounter;
  });
});
