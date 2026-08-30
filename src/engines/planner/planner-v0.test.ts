import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import { analyzeWeaknesses, buildPlan, resolveCurrentDay } from "@/engines/planner/planner-v0";
import { applyReview, introduceItem } from "@/engines/memory/memory-engine-v0";
import { completeDay } from "@/study/session";

const NOW = Date.now();
const DAY = 86_400_000;

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
});

async function seedListeningFailures(count: number): Promise<void> {
  const rows = Array.from({ length: count }, (_, i) => ({
    id: `lis-${i}`,
    occurredAt: NOW - (count - i) * 1000,
    skill: "listening",
    interaction: "listening",
    correct: false,
  }));
  await db.learningEvents.bulkAdd(rows);
}

describe("Planner v0 rules", () => {
  it("plans lesson -> practice -> assessment on a fresh account", async () => {
    const plan = await buildPlan(NOW);
    expect(plan.currentDay).toBe(1);
    expect(await resolveCurrentDay()).toBe(1);
    expect(plan.blocks.map((block) => block.kind)).toEqual([
      "lesson",
      "practice",
      "assessment",
    ]);
    expect(plan.dueCards).toHaveLength(0);
  });

  it("puts due SRS reviews first", async () => {
    await introduceItem("w:hi", 0.2, NOW - DAY);
    const plan = await buildPlan(NOW);
    expect(plan.blocks[0].kind).toBe("review");
    expect(plan.dueCards.length).toBe(1);
    expect(plan.blocks.map((block) => block.kind)).toContain("lesson");
  });

  it("adds listening drills when recent listening accuracy drops below 50%", async () => {
    await seedListeningFailures(10);
    const weakness = await analyzeWeaknesses();
    expect(weakness.extraListening).toBe(true);

    const plan = await buildPlan(NOW);
    const practice = plan.blocks.find((block) => block.kind === "practice");
    expect(practice?.kind).toBe("practice");
    if (practice?.kind === "practice") {
      expect(practice.extraListening).toBe(true);
    }
    expect(
      plan.notices.some((notice) => notice.includes("听力")),
    ).toBe(true);
  });

  it("adds recall drills when words are recognized but never produced", async () => {
    await introduceItem("w:bye", 0.2, NOW - DAY);
    // Recognition success only -> stage recognized, producedCount stays 0.
    await applyReview({ itemId: "w:bye", grade: 1, production: false, nowMs: NOW - DAY });
    const weakness = await analyzeWeaknesses();
    expect(weakness.productionGapCount).toBe(1);
    expect(weakness.extraRecall).toBe(true);

    const plan = await buildPlan(NOW);
    const practice = plan.blocks.find((block) => block.kind === "practice");
    if (practice?.kind === "practice") {
      expect(practice.extraRecall).toBe(true);
    }
  });

  it("advances to the next authored day after completing one", async () => {
    await completeDay(1, 86);
    const plan = await buildPlan(NOW);
    expect(plan.currentDay).toBe(2);
    const lesson = plan.blocks.find((block) => block.kind === "lesson");
    expect(lesson?.kind).toBe("lesson");
    if (lesson?.kind === "lesson") {
      expect(lesson.day).toBe(2);
      expect(lesson.titleZh).toContain("第 2 天");
    }
  });

  it("inserts a targeted drill block when the same error repeats (Phase 2)", async () => {
    // Two identical failures on one item -> repeated error -> drill block.
    for (let i = 0; i < 2; i++) {
      await db.learningEvents.add({
        id: `evt-drill-${i}`,
        occurredAt: NOW - 1000 + i,
        skill: "vocabulary",
        interaction: "recall",
        itemId: "w:three",
        correct: false,
      });
      await db.errors.add({
        id: `err-drill-${i}`,
        occurredAt: NOW - 1000 + i,
        skill: "vocabulary",
        category: "vocabulary-mistake",
        descriptionZh: "three 回忆失败",
        severity: "medium",
        relatedItemIds: ["w:three"],
        resolvedAt: null,
        errorType: "recall-failure",
      });
    }

    const plan = await buildPlan(NOW);
    const drillIndex = plan.blocks.findIndex((block) => block.kind === "drill");
    expect(drillIndex).toBeGreaterThanOrEqual(0);

    // Drill comes right after review (or first when nothing is due).
    if (plan.blocks[0]?.kind === "review") {
      expect(drillIndex).toBe(1);
    } else {
      expect(drillIndex).toBe(0);
    }
    const drill = plan.blocks[drillIndex];
    expect(drill?.kind === "drill" ? drill.specs.length : 0).toBeGreaterThan(0);
    expect(
      plan.notices.some((notice) => notice.includes("专项训练")),
    ).toBe(true);
  });

  it("has no drill block on a clean record", async () => {
    const plan = await buildPlan(NOW);
    expect(plan.blocks.some((block) => block.kind === "drill")).toBe(false);
  });
});
