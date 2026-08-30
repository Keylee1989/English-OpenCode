import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import { computeGrowthReport, formatGrowthReportText, MILESTONE_DAYS } from "@/study/growth-report";

function milestoneRow(day: number, overall: number, skills: Record<string, number>) {
  return {
    id: `m${day}`,
    type: "milestone" as const,
    day,
    startedAt: Date.now() - 10000,
    completedAt: Date.now() - 9000 + day,
    overallScore: overall,
    level: "测试",
    data: { skillScores: skills, overallScore: overall },
  };
}

beforeEach(async () => {
  await db.assessments.clear();
});

describe("growth report", () => {
  it("lists milestone constants", () => {
    expect([...MILESTONE_DAYS]).toEqual([30, 60, 90]);
  });

  it("reports honestly when there are no assessments yet", async () => {
    const report = await computeGrowthReport();
    expect(report.overall.first).toBeNull();
    expect(report.overall.delta).toBeNull();
    const text = formatGrowthReportText(report);
    expect(text).toContain("尚无");
    // skill rows with no evidence are omitted from the delta list
    expect(text).toContain("技能变化");
  });

  it("compares first vs latest milestone per skill", async () => {
    await db.assessments.bulkPut([
      milestoneRow(30, 50, { vocabulary: 40, listening: 30, reading: 60, writing: 20, speaking: 10 }),
      milestoneRow(90, 70, { vocabulary: 65, listening: 55, reading: 75, writing: 45, speaking: 25 }),
    ]);
    const report = await computeGrowthReport();
    expect(report.milestonesCompleted).toEqual([30, 90]);
    expect(report.overall.first).toBe(50);
    expect(report.overall.latest).toBe(70);
    expect(report.overall.delta).toBe(20);

    const vocab = report.skills.find((s) => s.skill === "vocabulary")!;
    expect(vocab.first).toBe(40);
    expect(vocab.latest).toBe(65);
    expect(vocab.delta).toBe(25);

    const text = formatGrowthReportText(report);
    expect(text).toContain("Day 30、Day 90");
    expect(text).toContain("▲ +25");
    expect(text).toContain("词汇：40 → 65");
  });

  it("handles a single assessment (no delta yet)", async () => {
    await db.assessments.put(milestoneRow(60, 62, { vocabulary: 58 }));
    const report = await computeGrowthReport();
    expect(report.milestonesCompleted).toEqual([60]);
    expect(report.overall.delta).toBeNull();
    const vocab = report.skills.find((s) => s.skill === "vocabulary")!;
    expect(vocab.delta).toBeNull();
  });
});
