import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import {
  rng,
  shuffle,
  blankWord,
  sampleKnownItems,
  computeBaseline,
  deltaPct,
  loadRetentionSettings,
  persistRetentionSettings,
  loadKnownLexicalIds,
  type RetentionSnapshot,
  type ValidationResult,
} from "@/study/validation/lvm";
import { findLexical } from "@/content/vocab";

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe("Learning Validation Mode - deterministic sampling helpers", () => {
  it("rng is deterministic for a given seed", () => {
    const a = rng(42);
    const b = rng(42);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
    expect(new Set(seqA).size).toBeGreaterThan(1);
  });

  it("shuffle is a stable permutation (same seed, same order)", () => {
    const src = ["a", "b", "c", "d", "e"];
    expect(shuffle(src, rng(7))).toEqual(shuffle(src, rng(7)));
    expect(shuffle(src, rng(7)).sort()).toEqual(src.slice().sort());
  });

  it("blankWord blanks the target case-insensitively", () => {
    expect(blankWord("Please bring me a glass of water.", "water")).toContain("______");
    expect(blankWord("Water is essential.", "water")).toContain("______");
    expect(blankWord("The word is absent.", "water")).toContain("water");
  });

  it("sampling is deterministic and honours the known set", () => {
    const knownIds = ["w:water", "w:book", "w:apple", "w:house", "w:time", "w:day", "w:hand", "w:eye"];
    const known = knownIds.filter((id) => findLexical(id));
    expect(known.length).toBeGreaterThanOrEqual(4);
    const s1 = sampleKnownItems(known, 2, 99);
    const s2 = sampleKnownItems(known, 2, 99);
    expect(s1).toEqual(s2);
    expect(s1.length).toBeLessThanOrEqual(2);
    for (const item of s1) {
      expect(known).toContain(item.id);
      // 4 options, exactly one is the correct zh, distractors differ.
      expect(item.options.length).toBe(4);
      expect(new Set(item.options).size).toBe(4);
      expect(item.options).toContain(item.zh);
      expect(item.gapKey).toBe(item.word.toLowerCase());
    }
  });
});

describe("Learning Validation Mode - baseline math", () => {
  it("computeBaseline renders correct rates by mode", () => {
    const results: ValidationResult[] = [
      { itemId: "w:a", mode: "recognition", correct: true, answer: "x" },
      { itemId: "w:b", mode: "recognition", correct: false, answer: "y" },
      { itemId: "w:c", mode: "gapfill", correct: true, answer: "z" },
      { itemId: "w:d", mode: "gapfill", correct: false, answer: "w" },
    ];
    const snap = computeBaseline(results);
    expect(snap.total).toBe(4);
    expect(snap.correct).toBe(2);
    expect(snap.recallPct).toBeCloseTo(50, 1);
    expect(snap.recognitionAcc).toBeCloseTo(50, 1);
    expect(snap.gapFillAcc).toBeCloseTo(50, 1);
    expect(snap.kind).toBe("lv-latest");
    expect(snap.itemIds).toEqual(["w:a", "w:b", "w:c", "w:d"]);
  });

  it("computeBaseline emits null gap-fill accuracy when none answered", () => {
    const snap = computeBaseline([
      { itemId: "w:a", mode: "recognition", correct: true, answer: "x" },
    ]);
    expect(snap.gapFillAcc).toBeNull();
  });

  it("deltaPct is signed and null without a baseline", () => {
    const base: RetentionSnapshot = computeBaseline([
      { itemId: "w:a", mode: "recognition", correct: true, answer: "x" },
      { itemId: "w:b", mode: "recognition", correct: false, answer: "y" },
    ]);
    const later: RetentionSnapshot = computeBaseline([
      { itemId: "w:c", mode: "recognition", correct: true, answer: "x" },
    ]);
    expect(deltaPct(later, base)).toBeCloseTo(50, 1);
    expect(deltaPct(later, null)).toBeNull();
  });
});

describe("Learning Validation Mode - persistence (IndexedDB settings table)", () => {
  it("returns empty cache when nothing recorded", async () => {
    const cache = await loadRetentionSettings();
    expect(cache.baseline).toBeNull();
    expect(cache.latest).toBeNull();
  });

  it("round-trips baseline and latest snapshots", async () => {
    const baseline = computeBaseline([
      { itemId: "w:water", mode: "recognition", correct: true, answer: "水" },
    ]);
    const latest = computeBaseline([
      { itemId: "w:book", mode: "gapfill", correct: false, answer: "nope" },
    ]);
    baseline.kind = "lv-baseline";
    await persistRetentionSettings({ baseline, latest });
    const reloaded = await loadRetentionSettings();
    expect(reloaded.baseline?.kind).toBe("lv-baseline");
    expect(reloaded.baseline?.itemIds).toEqual(["w:water"]);
    expect(reloaded.latest?.itemIds).toEqual(["w:book"]);
  });

  it("loadKnownLexicalIds falls back to frequent words when nothing engaged", async () => {
    const ids = await loadKnownLexicalIds();
    expect(ids.length).toBeGreaterThan(0);
    // Every returned id must resolve in the lexical model.
    expect(ids.every((id) => findLexical(id) !== null)).toBe(true);
  });

  it("loadKnownLexicalIds returns engaged (recognized+) lexical ids only", async () => {
    await db.memoryStates.clear();
    await db.memoryStates.put({
      itemId: "w:water",
      stage: "mastered",
      stability: 30,
      difficulty: 0.2,
      dueAt: Date.now() + 1e6,
      lastReviewedAt: Date.now(),
      successfulReps: 5,
      lapses: 0,
      reviewCount: 5,
      successCount: 5,
      failureCount: 0,
      producedCount: 3,
    });
    await db.memoryStates.put({
      itemId: "w:book",
      stage: "seen",
      stability: 1,
      difficulty: 0.5,
      dueAt: Date.now(),
      lastReviewedAt: null,
      successfulReps: 0,
      lapses: 0,
      reviewCount: 0,
      successCount: 0,
      failureCount: 0,
      producedCount: 0,
    });
    const ids = await loadKnownLexicalIds();
    expect(ids).toContain("w:water");
    expect(ids).not.toContain("w:book");
  });
});
