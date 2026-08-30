import { describe, expect, it } from "vitest";
import { buildStudentContext } from "@/engines/tutor/context-builder";
import { formatContextForAi, buildTutorSystemPrompt } from "@/engines/tutor/context-format";
import { db } from "@/data/db";

async function seedLearningEvidence(): Promise<void> {
  await db.abilities.bulkPut([
    { skill: "listening", score: 42, confidence: 0.6, evidenceCount: 12, lastUpdated: Date.now(), trend: "up" },
    { skill: "vocabulary", score: 61, confidence: 0.7, evidenceCount: 30, lastUpdated: Date.now(), trend: "flat" },
    { skill: "speaking", score: 20, confidence: 0.4, evidenceCount: 5, lastUpdated: Date.now(), trend: "down" },
  ]);
  await db.memoryStates.bulkPut([
    {
      itemId: "w:test-a", stage: "recognized", stability: 1, difficulty: 0.3,
      dueAt: Date.now(), lastReviewedAt: null, successfulReps: 1, lapses: 0,
      reviewCount: 1, successCount: 1, failureCount: 0, producedCount: 0,
    },
    {
      itemId: "w:test-b", stage: "produced", stability: 2, difficulty: 0.4,
      dueAt: Date.now(), lastReviewedAt: null, successfulReps: 3, lapses: 0,
      reviewCount: 3, successCount: 3, failureCount: 0, producedCount: 2,
    },
  ]);
  await db.errors.bulkPut([
    {
      id: "e1", occurredAt: Date.now(), skill: "listening",
      category: "vocabulary-mistake", descriptionZh: "听错单词", severity: "low",
      relatedItemIds: [], resolvedAt: null,
    },
  ]);
  await db.dailySessions.bulkPut([
    {
      dateISO: "2026-08-20", startedAt: Date.now() - 86400000, endedAt: null,
      dayStartAbilities: {}, completedBlocks: ["lesson", "practice"], assessmentScore: 80,
    },
  ]);
}

describe("Student Context Builder (AI Tutor Context Layer)", () => {
  it("aggregates abilities/errors/knowledge/lesson/history into one snapshot", async () => {
    await seedLearningEvidence();
    const ctx = await buildStudentContext();

    expect(ctx.currentDay).toBeGreaterThanOrEqual(1);
    expect(ctx.authoredDays).toBe(360);
    expect(ctx.scaffoldLevel.length).toBeGreaterThan(0);

    // Abilities sorted low -> high, only evidenced ones.
    const scores = ctx.abilities.map((a) => a.score);
    expect(scores).toEqual([...scores].sort((a, b) => a - b));
    const skills = ctx.abilities.map((a) => a.skill);
    expect(skills).toContain("listening");
    expect(skills).not.toContain("reading"); // no evidence recorded for reading
    expect(ctx.weakestSkills[0]).toBe("speaking"); // lowest score first

    expect(ctx.fatigue.recentErrorRate).toBe(0); // no graded events seeded
    expect(ctx.errors.total).toBe(1);
    expect(ctx.errors.repeatedCategories).toHaveLength(0);

    expect(ctx.knowledge.words).toBeGreaterThanOrEqual(3000);
    expect(ctx.knowledge.stageCounts.recognized).toBe(1);
    expect(ctx.knowledge.stageCounts.produced).toBe(1);

    // Current lesson reflects the planner's resolveCurrentDay (day 1 with empty progress).
    expect(ctx.currentLesson).not.toBeNull();
    expect(ctx.currentLesson!.day).toBe(1);
    expect(ctx.currentLesson!.vocabWords.length).toBeGreaterThan(0);

    expect(ctx.recentHistory).toEqual([
      { dateISO: "2026-08-20", completedBlocks: 2, assessmentScore: 80 },
    ]);
  });

  it("formats a compact AI-readable block containing the key signals", async () => {
    await seedLearningEvidence();
    const ctx = await buildStudentContext();
    const text = formatContextForAi(ctx);

    expect(text).toContain("[student-context]");
    expect(text).toMatch(/day=/);
    expect(text).toContain("abilities(low->high)");
    expect(text).toContain("weakest:");
    expect(text).toContain("errors: total=1");
    expect(text).toContain("knowledge: lexicon=");
    expect(text).toContain("current-lesson:");
    expect(text).toContain("recent-history:");
    // Compactness guard: context must stay small enough to be prompt-friendly.
    expect(text.length).toBeLessThan(2000);
  });

  it("builds a zh-scaffold system prompt embedding the context", async () => {
    const ctx = await buildStudentContext();
    ctx.scaffoldLevel = "chinese-dominant";
    const prompt = buildTutorSystemPrompt(ctx);
    expect(prompt).toContain("English360");
    expect(prompt).toContain("中文为主");
    expect(prompt).toContain("[student-context]");
  });

  it("adapts scaffold instructions by settings level", () => {
    const base = {
      generatedAt: 0, currentDay: 40, authoredDays: 90, scaffoldLevel: "english-first",
      abilities: [], weakestSkills: [], fatigue: { recentErrorRate: 0, avgLatencyTrendMs: 0 },
      errors: { total: 0, repeatedCategories: [], weakSkills: [] },
      knowledge: { words: 3000, grammarNodes: 90, stageCounts: {} },
      currentLesson: null, recentHistory: [],
    };
    const englishFirst = buildTutorSystemPrompt({ ...base });
    expect(englishFirst).toContain("以英文为主");

    const balanced = buildTutorSystemPrompt({ ...base, scaffoldLevel: "balanced" });
    expect(balanced).toContain("双语讲解");
  });
});
