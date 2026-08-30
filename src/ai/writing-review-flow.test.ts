import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/data/db";
import type { IAiProvider } from "@/ai/provider";
import { evaluateWriting } from "@/ai/tutor-service";
import { storeEnrichedError } from "@/engines/errors/error-analysis-v0";

/**
 * Phase 4-B 作文纠错流程 (service-level integration):
 * evaluateWriting() -> accepted corrections -> Error Bank rows.
 * This mirrors exactly what WritingCard does after a successful AI review.
 */
function providerReturning(text: string): IAiProvider {
  return {
    providerId: "fake",
    modelId: "fake",
    complete: vi.fn().mockResolvedValue({ text, finishReason: "stop" }),
  } as unknown as IAiProvider;
}

const GOOD_REVIEW = JSON.stringify({
  score: 66,
  corrections: [
    { wrong: "I are happy", right: "I am happy", noteZh: "主谓一致：I 用 am。" },
    { wrong: "yesterday", right: "last weekend", noteZh: "时间状语搭配。" },
  ],
  feedbackZh: "意思清楚，注意主谓一致和时间表达。",
});

beforeEach(async () => {
  await db.errors.clear();
});

describe("writing review flow -> Error Bank", () => {
  it("persists one enriched error row per accepted correction", async () => {
    const provider = providerReturning(GOOD_REVIEW);
    const submission = "I are happy yesterday.";
    const outcome = await evaluateWriting(provider, {
      promptEn: "写一句你上周末的感受。",
      submission,
      contextBlock: "abilities(low->high): writing:35",
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    // Same loop WritingCard runs after a successful evaluation.
    for (const fix of outcome.evaluation.corrections.slice(0, 5)) {
      await storeEnrichedError(
        {
          occurredAt: Date.now(),
          skill: "writing",
          category: "writing-mistake",
          descriptionZh: `“${fix.wrong}” → “${fix.right}”：${fix.noteZh}`,
          relatedItemIds: [],
        },
        {
          category: "writing-mistake",
          skill: "writing",
          interaction: "writing",
          answerText: submission,
        },
      );
    }

    const rows = await db.errors.toArray();
    expect(rows).toHaveLength(outcome.evaluation.corrections.length);
    for (const row of rows) {
      expect(row.skill).toBe("writing");
      expect(row.category).toBe("writing-mistake");
      expect(row.answerText).toBe(submission);
      expect(row.resolvedAt).toBeNull();
    }
    // Every correction (原句 → 修改) is represented in the bank.
    for (const fix of outcome.evaluation.corrections) {
      const match = rows.find(
        (row) => row.descriptionZh.includes(fix.wrong) && row.descriptionZh.includes(fix.right),
      );
      expect(match, `missing correction: ${fix.wrong}`).toBeTruthy();
    }
  });

  it("writes nothing when the AI response is invalid (honest degradation)", async () => {
    const provider = providerReturning("score is 80, trust me"); // not JSON
    const outcome = await evaluateWriting(provider, {
      promptEn: "p",
      submission: "s",
    });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reasonZh).toContain("格式无效");
    expect(await db.errors.toArray()).toHaveLength(0);
  });

  it("caps persisted corrections at five per submission", async () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      wrong: `w${i}`,
      right: `r${i}`,
      noteZh: `n${i}`,
    }));
    const provider = providerReturning(
      JSON.stringify({ score: 50, corrections: many, feedbackZh: "ok" }),
    );
    const outcome = await evaluateWriting(provider, { promptEn: "p", submission: "s" });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    for (const fix of outcome.evaluation.corrections.slice(0, 5)) {
      await storeEnrichedError(
        {
          occurredAt: Date.now(),
          skill: "writing",
          category: "writing-mistake",
          descriptionZh: `${fix.wrong}->${fix.right}:${fix.noteZh}`,
          relatedItemIds: [],
        },
        { category: "writing-mistake", skill: "writing", interaction: "writing" },
      );
    }
    expect(await db.errors.count()).toBe(5);
  });
});
