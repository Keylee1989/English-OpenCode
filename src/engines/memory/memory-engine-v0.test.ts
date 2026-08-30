import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import {
  applyReview,
  getDueCards,
  introduceItem,
  predictRecall,
} from "@/engines/memory/memory-engine-v0";

const DAY = 86_400_000;
const T0 = 1_700_000_000_000;

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe("Memory/SRS v0 - review success path (Test 3)", () => {
  it("increases stability and pushes nextReview later", async () => {
    await introduceItem("w:hi", 0.2, T0);

    const first = await applyReview({ itemId: "w:hi", grade: 1, nowMs: T0 });
    // First successful retrieval from a fresh item schedules tomorrow.
    expect(first.stability).toBe(1);
    expect(first.dueAt).toBe(T0 + DAY);
    expect(first.successCount).toBe(1);
    expect(first.reviewCount).toBe(1);
    expect(first.stage).toBe("recognized");

    const beforeStability = first.stability;
    const beforeDueAt = first.dueAt;

    const second = await applyReview({ itemId: "w:hi", grade: 1, nowMs: T0 + DAY });
    expect(second.stability).toBeGreaterThan(beforeStability);
    expect(second.dueAt).toBeGreaterThan(beforeDueAt);
    expect(second.successCount).toBe(2);
  });

  it("production success moves the stage faster than recognition", async () => {
    await introduceItem("w:bye", 0.2, T0);
    const rec = await applyReview({ itemId: "w:bye", grade: 1, nowMs: T0 });
    const prod = await applyReview({
      itemId: "w:bye",
      grade: 1,
      production: true,
      nowMs: T0 + DAY,
    });
    expect(rec.stage).toBe("recognized");
    expect(prod.stage).toBe("produced");
    expect(prod.producedCount).toBe(1);
  });

  it("predictRecall decays over time and stays high right after review", async () => {
    await introduceItem("w:ok", 0.2, T0);
    await applyReview({ itemId: "w:ok", grade: 1, nowMs: T0 });
    const soon = await predictRecall("w:ok", T0 + 60_000);
    const late = await predictRecall("w:ok", T0 + 5 * DAY);
    expect(soon).toBeGreaterThan(0.9);
    expect(late).toBeLessThan(soon);
  });
});

describe("Memory/SRS v0 - review failure path (Test 2)", () => {
  it("raises difficulty and schedules the retry earlier than the success path", async () => {
    await introduceItem("w:thanks", 0.3, T0);
    // Build up some stability with two successes on consecutive days.
    await applyReview({ itemId: "w:thanks", grade: 1, nowMs: T0 });
    const healthy = await applyReview({ itemId: "w:thanks", grade: 1, nowMs: T0 + DAY });
    expect(healthy.stability).toBeGreaterThan(1);
    const previousDueAt = healthy.dueAt;
    const previousDifficulty = healthy.difficulty;

    // Twin item with identical history - but its next review SUCCEEDS,
    // giving the counterfactual "what would have been scheduled" baseline.
    await introduceItem("w:twin", 0.3, T0);
    await applyReview({ itemId: "w:twin", grade: 1, nowMs: T0 });
    await applyReview({ itemId: "w:twin", grade: 1, nowMs: T0 + DAY });
    const twinSuccess = await applyReview({
      itemId: "w:twin",
      grade: 1,
      nowMs: previousDueAt,
    });

    const failed = await applyReview({ itemId: "w:thanks", grade: 0, nowMs: previousDueAt });

    // 难度上升、稳定性骤降
    expect(failed.difficulty).toBeGreaterThan(previousDifficulty);
    expect(failed.stability).toBeLessThan(twinSuccess.stability);
    // 复习失败 -> 下次复习时间比成功路径明显提前
    expect(failed.dueAt).toBeLessThan(previousDueAt + DAY); // within a day, not weeks
    expect(failed.dueAt).toBeLessThan(twinSuccess.dueAt);
    expect(failed.failureCount).toBe(1);
    expect(failed.lapses).toBe(1);
    expect(failed.successCount).toBe(2);
  });

  it("failure on a never-reviewed item schedules a same-day retry (>=10 min)", async () => {
    await introduceItem("w:sorry", 0.4, T0);
    const failed = await applyReview({ itemId: "w:sorry", grade: 0, nowMs: T0 });
    expect(failed.stability).toBeGreaterThanOrEqual(10 / (24 * 60));
    expect(failed.dueAt).toBeGreaterThan(T0);
    expect(failed.dueAt).toBeLessThan(T0 + 60 * 60_000); // within the hour
    expect(failed.stage).toBe("unseen");
  });

  it("due queue returns overdue items first and adapts modes to audio support", async () => {
    await introduceItem("w:a", 0.2, T0 - 2 * DAY);
    await introduceItem("w:b", 0.2, T0 - DAY);
    await db.memoryStates.update("w:a", { dueAt: T0 - 2 * DAY, stage: "recalled" });
    await db.memoryStates.update("w:b", { dueAt: T0 - DAY, stage: "recalled" });

    const withSpeech = await getDueCards(T0, 10, { speechAvailable: true });
    expect(withSpeech.map((card) => card.state.itemId)).toEqual(["w:a", "w:b"]);
    expect(withSpeech[0].suggestedModes).toContain("sentence-production");

    const withoutSpeech = await getDueCards(T0, 10, { speechAvailable: false });
    for (const card of withoutSpeech) {
      expect(card.suggestedModes).not.toContain("listening-recall");
    }
  });

  it("hard items (lapses >= 2) fall back to recognition mode", async () => {
    await introduceItem("w:c", 0.5, T0 - DAY);
    await db.memoryStates.update("w:c", { lapses: 2, difficulty: 0.8, stage: "recalled" });
    const cards = await getDueCards(T0, 10, { speechAvailable: true });
    const hardCard = cards.find((card) => card.state.itemId === "w:c");
    expect(hardCard?.suggestedModes[0]).toBe("recognition");
  });
});
