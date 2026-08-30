import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import { track } from "@/data/recorder";
import {
  classifyError,
  detectRepeatedErrors,
  generateRemedialExercises,
  getErrorStats,
  getRemedialSpecs,
  levenshtein,
} from "@/engines/errors/error-analysis-v0";

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe("error classification", () => {
  it("computes edit distance for spelling discrimination", () => {
    expect(levenshtein("helo", "hello")).toBe(1);
    expect(levenshtein("hi", "hi")).toBe(0);
    expect(levenshtein("abc", "xyz")).toBe(3);
  });

  it("classifies multiple-choice failures as recognition mismatch", () => {
    const result = classifyError({
      category: "vocabulary-mistake",
      skill: "vocabulary",
      interaction: "multiple-choice",
      itemId: "w:water",
    });
    expect(result.errorType).toBe("recognition-mismatch");
    expect(result.possibleCauseZh).toContain("water");
    expect(result.recommendedPracticeZh.length).toBeGreaterThan(0);
  });

  it("separates near-miss spelling from total recall failure", () => {
    const spelling = classifyError({
      category: "vocabulary-mistake",
      skill: "vocabulary",
      interaction: "recall",
      itemId: "w:hello",
      answerText: "helo", // distance 1
    });
    expect(spelling.errorType).toBe("spelling");

    const recall = classifyError({
      category: "vocabulary-mistake",
      skill: "vocabulary",
      interaction: "recall",
      itemId: "w:hello",
      answerText: "goodbye",
    });
    expect(recall.errorType).toBe("recall-failure");
    expect(recall.possibleCauseZh).toContain("输出");
  });

  it("uses the Knowledge Model: listening failure on a minimal-pair word becomes phonics confusion", () => {
    // eat <-> it is an authored minimal pair
    const confused = classifyError({
      category: "listening-mistake",
      skill: "listening",
      interaction: "listening",
      itemId: "w:eat",
    });
    expect(confused.errorType).toBe("phonics-confusion");
    expect(confused.relatedKnowledge).toContain("w:it");
    expect(confused.recommendedPracticeZh).toContain("eat");

    const plain = classifyError({
      category: "listening-mistake",
      skill: "listening",
      interaction: "listening",
      itemId: "w:family",
    });
    expect(plain.errorType).toBe("listening-mishear");
  });

  it("routes sentence-ordering failures to word-order with grammar knowledge", () => {
    const result = classifyError({
      category: "grammar-mistake",
      skill: "grammar",
      interaction: "sentence-ordering",
      grammarNodeId: "g:p:im",
    });
    expect(result.errorType).toBe("word-order");
    expect(result.relatedKnowledge).toContain("g:p:im");
    expect(result.recommendedPracticeZh).toContain("连词成句");
  });
});

describe("statistics & repeated-error detection", () => {
  it("tracks high-frequency categories, repeats and weak skills", async () => {
    for (let i = 0; i < 3; i++) {
      await track({
        skill: "listening",
        interaction: "listening",
        itemId: "w:eat",
        correct: false,
        errorCategory: "listening-mistake",
        errorDescriptionZh: `听错 eat 第 ${i + 1} 次`,
      });
    }
    for (let i = 0; i < 8; i++) {
      await track({
        skill: "reading",
        interaction: "reading-comprehension",
        correct: false,
        errorCategory: "reading-mistake",
        errorDescriptionZh: `阅读理解错误 ${i + 1}`,
      });
    }

    const stats = await getErrorStats();
    expect(stats.total).toBe(11);
    expect(stats.byCategory[0].category).toBe("reading-mistake");
    expect(stats.byCategory[0].count).toBe(8);
    expect(stats.repeatedCategories).toContain("listening-mistake");
    expect(stats.weakSkills.some((entry) => entry.skill === "reading")).toBe(true);

    // Enrichment persisted by the recorder path.
    const rows = await db.errors.toArray();
    const enriched = rows.find((row) => row.category === "listening-mistake");
    expect(enriched?.errorType).toBe("phonics-confusion");
    expect(enriched?.possibleCauseZh?.length ?? 0).toBeGreaterThan(0);
    expect(enriched?.relatedKnowledge).toContain("w:it");
    expect(enriched?.recommendedPracticeZh?.length ?? 0).toBeGreaterThan(0);
  });

  it("detects repeated errors on the SAME item only (重复错误检测)", async () => {
    await track({
      skill: "vocabulary",
      interaction: "recall",
      itemId: "w:three",
      correct: false,
      errorCategory: "vocabulary-mistake",
      errorDescriptionZh: "three 拼写错误 A",
    });
    await track({
      skill: "vocabulary",
      interaction: "recall",
      itemId: "w:three",
      correct: false,
      errorCategory: "vocabulary-mistake",
      errorDescriptionZh: "three 拼写错误 B",
    });
    // Same category but a DIFFERENT item - must not merge.
    await track({
      skill: "vocabulary",
      interaction: "recall",
      itemId: "w:thanks",
      correct: false,
      errorCategory: "vocabulary-mistake",
      errorDescriptionZh: "thanks 错误",
    });

    const repeated = await detectRepeatedErrors(2);
    const three = repeated.find((group) => group.itemId === "w:three");
    expect(three?.count).toBe(2);
    expect(repeated.find((group) => group.itemId === "w:thanks")).toBeUndefined();
  });
});

describe("remedial specs -> targeted exercises", () => {
  it("builds phonics drills for recurring listening confusions", async () => {
    for (let i = 0; i < 2; i++) {
      await track({
        skill: "listening",
        interaction: "listening",
        itemId: "w:work",
        correct: false,
        errorCategory: "listening-mistake",
        errorDescriptionZh: "work/walk 听辨失败",
      });
    }
    const specs = await getRemedialSpecs();
    const phonicsSpec = specs.find((spec) => spec.kind === "phonics");
    expect(phonicsSpec).toBeDefined();

    const exercises = generateRemedialExercises(specs);
    expect(exercises.length).toBeGreaterThan(0);
    expect(
      exercises.some(
        (exercise) =>
          exercise.type === "phonics-discriminate" &&
          exercise.id === "pd-pair-work-walk",
      ),
    ).toBe(true);
  });

  it("builds vocabulary drills for recurring word errors", async () => {
    for (let i = 0; i < 2; i++) {
      await track({
        skill: "vocabulary",
        interaction: "recall",
        itemId: "w:three",
        correct: false,
        errorCategory: "vocabulary-mistake",
        errorDescriptionZh: "three 回忆失败",
      });
    }
    const specs = await getRemedialSpecs();
    const itemSpec = specs.find((spec) => spec.kind === "items");
    expect(itemSpec?.kind === "items" ? itemSpec.itemIds : []).toContain("w:three");

    const exercises = generateRemedialExercises([itemSpec!]);
    expect(exercises.length).toBeGreaterThan(0);
    expect(
      exercises.some(
        (exercise) =>
          exercise.type === "recall-type" && exercise.itemId === "w:three",
      ),
    ).toBe(true);
  });

  it("returns no specs when there are no repeated errors", async () => {
    await track({
      skill: "vocabulary",
      interaction: "recall",
      itemId: "w:one",
      correct: false,
      errorCategory: "vocabulary-mistake",
      errorDescriptionZh: "只错一次",
    });
    expect(await getRemedialSpecs()).toEqual([]);
  });
});
