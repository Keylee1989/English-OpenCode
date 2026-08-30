import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import {
  getDifficultyStats,
  getDropOffAnalysis,
  getFunnelStats,
} from "@/study/beta/beta-analytics";
import { logBetaEvent, setStudyMode } from "@/study/beta-mode";

describe("Beta Analytics (Phase 12 P0-1)", () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it("computes funnel stats from real dayProgress rows", async () => {
    await db.dayProgress.bulkPut([
      { day: 1, status: "completed", startedAt: 1, lessonDoneAt: 1, completedAt: 1, score: 90 },
      { day: 2, status: "completed", startedAt: 2, lessonDoneAt: 2, completedAt: 2, score: 88 },
      { day: 3, status: "in-progress", startedAt: 3, lessonDoneAt: 3, completedAt: null, score: null },
      { day: 5, status: "in-progress", startedAt: 5, lessonDoneAt: null, completedAt: null, score: null },
    ]);
    const funnel = await getFunnelStats();
    expect(funnel.day1CompletionRatePercent).toBe(100);
    expect(funnel.day3RetentionRatePercent).toBe(100);
    expect(funnel.day7RetentionRatePercent).toBe(0);
    expect(funnel.day30CompletionRatePercent).toBe(0);
    expect(funnel.maxDayReached).toBe(5);
    expect(funnel.daysCompleted).toBe(2);
  });

  it("empty progress yields a zeroed funnel without throwing", async () => {
    const funnel = await getFunnelStats();
    expect(funnel.maxDayReached).toBe(0);
    expect(funnel.day1CompletionRatePercent).toBe(0);
    expect(funnel.daysCompleted).toBe(0);
  });

  it("groups drop-off events by day / block kind / step", async () => {
    await setStudyMode("beta-test");
    await logBetaEvent("drop-off", { step: 2, total: 5, blockKind: "listening", day: 5 });
    await logBetaEvent("drop-off", { step: 3, total: 5, blockKind: "grammar", day: 12 });
    await logBetaEvent("drop-off", { step: 2, total: 5, blockKind: "listening", day: 5 });
    await logBetaEvent("session-start", {});
    const analysis = await getDropOffAnalysis();
    expect(analysis.totalEvents).toBe(3);
    expect(analysis.byDay[0]).toEqual({ key: "Day 5", count: 2 });
    expect(analysis.byBlockKind[0]).toEqual({ key: "listening", count: 2 });
    expect(analysis.byStep[0]).toEqual({ key: "步骤 2", count: 2 });
    expect(analysis.worstSpotZh).toContain("Day 5");
    await setStudyMode("normal");
  });

  it("aggregates difficulty feedback by rating and flags hard days", async () => {
    await setStudyMode("beta-test");
    await logBetaEvent("difficulty-feedback", { day: 12, rating: "偏难" });
    await logBetaEvent("difficulty-feedback", { day: 12, rating: "偏难" });
    await logBetaEvent("difficulty-feedback", { day: 13, rating: "适中" });
    await logBetaEvent("difficulty-feedback", { day: 14, rating: "偏易" });
    const stats = await getDifficultyStats();
    expect(stats.total).toBe(4);
    expect(stats.easy).toBe(1);
    expect(stats.normal).toBe(1);
    expect(stats.hard).toBe(2);
    expect(stats.hardPercent).toBe(50);
    expect(stats.hardByDay[0]).toEqual({ key: "Day 12", count: 2 });
    await setStudyMode("normal");
  });
});
