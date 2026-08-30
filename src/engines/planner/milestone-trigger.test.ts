import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import { buildPlan } from "@/engines/planner/planner-v0";
import { completeDay } from "@/study/session";
import { MILESTONE_DAYS } from "@/engines/assessment/assessment-v0";

const NOW = Date.now();

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
});

async function completeDaysThrough(lastDay: number): Promise<void> {
  for (let day = 1; day <= lastDay; day++) {
    await completeDay(day, 80);
  }
}

describe("milestone auto-assessment (Phase 6)", () => {
  it("triggers for Day 30 right after it is completed", async () => {
    await completeDaysThrough(30);
    const plan = await buildPlan(NOW);
    const milestone = plan.blocks.find(
      (b) => b.kind === "assessment" && b.titleZh.includes("里程碑"),
    );
    expect(milestone).toBeTruthy();
    if (milestone?.kind === "assessment") {
      expect(milestone.day).toBe(30);
      expect(milestone.titleZh).toContain("今日里程碑测评");
    }
  });

  it("triggers for Day 60", async () => {
    await completeDaysThrough(60);
    const plan = await buildPlan(NOW);
    const milestone = plan.blocks.find(
      (b) => b.kind === "assessment" && b.titleZh.includes("里程碑"),
    );
    expect(milestone).toBeTruthy();
    if (milestone?.kind === "assessment") expect(milestone.day).toBe(60);
  });

  it("triggers for Day 90", async () => {
    await completeDaysThrough(90);
    const plan = await buildPlan(NOW);
    const milestone = plan.blocks.find(
      (b) => b.kind === "assessment" && b.titleZh.includes("里程碑"),
    );
    expect(milestone).toBeTruthy();
    if (milestone?.kind === "assessment") expect(milestone.day).toBe(90);
  });

  it("does NOT trigger on non-milestone days", async () => {
    await completeDaysThrough(45);
    const plan = await buildPlan(NOW);
    const milestoneBlocks = plan.blocks.filter(
      (b) => b.kind === "assessment" && b.titleZh.includes("里程碑"),
    );
    expect(milestoneBlocks).toHaveLength(0);
  });

  it("does not duplicate once the milestone session is recorded", async () => {
    await completeDaysThrough(30);
    await db.assessments.put({
      id: "m30",
      type: "milestone",
      day: 30,
      startedAt: NOW - 1000,
      completedAt: NOW,
      overallScore: 75,
      level: "基础 Basic",
      data: {},
    });
    const plan = await buildPlan(NOW);
    const milestoneBlocks = plan.blocks.filter(
      (b) => b.kind === "assessment" && b.titleZh.includes("里程碑"),
    );
    expect(milestoneBlocks).toHaveLength(0);
  });

  it("keeps MILESTONE_DAYS contract", () => {
    expect([...MILESTONE_DAYS]).toEqual([30, 60, 90]);
  });
});
