import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import { getMemoryHealth } from "@/study/analytics/analytics";

/**
 * Phase 13 P1-2: SRS memory health metrics.
 * dueAt windows relative to "now" drive all three indicators.
 */
describe("Memory health (Phase 13 P1-2)", () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  function baseRow(overrides: Partial<import("@/data/db").MemoryStateRow>) {
    return {
      itemId: `w:${Math.random().toString(36).slice(2)}`,
      stage: "recalled",
      stability: 3,
      difficulty: 0.3,
      dueAt: Date.now() + 86400000,
      lastReviewedAt: null,
      successfulReps: 2,
      lapses: 0,
      reviewCount: 2,
      successCount: 2,
      failureCount: 0,
      producedCount: 0,
      ...overrides,
    };
  }

  it("counts overdue items and computes the 7-day review completion rate", async () => {
    const now = Date.now();
    await db.memoryStates.bulkPut([
      // Came due 2 days ago, already reviewed on time.
      baseRow({ itemId: "w:a", dueAt: now - 2 * 86400000, lastReviewedAt: now - 1 * 86400000 }),
      // Came due yesterday, still waiting -> overdue + incomplete.
      baseRow({ itemId: "w:b", dueAt: now - 86400000 }),
      // Due in the future: neither overdue nor in the 7-day-due window.
      baseRow({ itemId: "w:c", dueAt: now + 5 * 86400000 }),
      // Unseen items are not tracked at all.
      baseRow({ itemId: "w:d", stage: "unseen", dueAt: now - 100000 }),
    ]);
    const health = await getMemoryHealth(now);
    expect(health.dueNotReviewed).toBe(1); // w:b
    expect(health.dueInLast7Days).toBe(2); // w:a + w:b
    expect(health.reviewCompletionRatePercent).toBe(50);
    expect(health.totalTrackedItems).toBe(3);
  });

  it("flags forget-risk words (lapses or high difficulty)", async () => {
    const now = Date.now();
    await db.memoryStates.bulkPut([
      baseRow({ itemId: "w:risk-lapse", lapses: 2, difficulty: 0.2 }),
      baseRow({ itemId: "w:risk-hard", lapses: 0, difficulty: 0.75 }),
      baseRow({ itemId: "w:safe", lapses: 0, difficulty: 0.3 }),
    ]);
    const health = await getMemoryHealth(now);
    expect(health.atRiskCount).toBe(2);
  });

  it("reports a perfect rate when nothing was due yet", async () => {
    const health = await getMemoryHealth();
    expect(health.reviewCompletionRatePercent).toBe(100);
    expect(health.dueNotReviewed).toBe(0);
  });
});
