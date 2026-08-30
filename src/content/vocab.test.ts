import { describe, expect, it } from "vitest";
import {
  allLexical,
  findLexical,
  getDanglingRelations,
  lexicalCount,
} from "@/content/vocab";
import { MINIMAL_PAIRS } from "@/phonics/rules";

describe("Vocabulary Model v0 (3000+ core words)", () => {
  it("contains at least 3000 unique entries", () => {
    expect(lexicalCount()).toBeGreaterThanOrEqual(3000);
    const ids = new Set(allLexical().map((entry) => entry.id));
    expect(ids.size).toBe(lexicalCount());
  });

  it("every entry carries meaning, IPA, example and at least one collocation", { timeout: 120000 }, () => {
    for (const entry of allLexical()) {
      expect(entry.id).toMatch(/^w:[a-z0-9'-]+$/);
      expect(entry.word.length, entry.id).toBeGreaterThan(0);
      expect(entry.zh.length, entry.id).toBeGreaterThan(0);
      expect(entry.ipa.startsWith("/"), entry.id).toBe(true);
      expect(entry.pos.length, entry.id).toBeGreaterThan(0);
      expect(entry.example.en.length, entry.id).toBeGreaterThan(0);
      expect(entry.example.zh.length, entry.id).toBeGreaterThan(0);
      expect(
        entry.collocations.length,
        `no collocation: ${entry.id}`,
      ).toBeGreaterThanOrEqual(1);
      for (const phrase of entry.collocations) {
        expect(phrase.length, entry.id).toBeGreaterThan(0);
      }
      expect(entry.frequencyBand, entry.id).toBeGreaterThanOrEqual(1);
      expect(entry.frequencyBand, entry.id).toBeLessThanOrEqual(7);
      expect(entry.difficulty, entry.id).toBeGreaterThan(0);
      expect(entry.difficulty, entry.id).toBeLessThan(1);
    }
  });

  it("has ZERO dangling relation endpoints", () => {
    expect(getDanglingRelations()).toEqual([]);
  });

  it("auto-links minimal-pair confusion partners mutually", () => {
    for (const pair of MINIMAL_PAIRS) {
      const a = findLexical(pair.aWord);
      const b = findLexical(pair.bWord);
      expect(a, pair.aWord).not.toBeNull();
      expect(b, pair.bWord).not.toBeNull();
      expect(a?.confusionPairIds).toContain(b?.id);
      expect(b?.confusionPairIds).toContain(a?.id);
    }
  });

  it("resolves lookups by id or bare word, case-insensitively", () => {
    expect(findLexical("w:water")?.word).toBe("water");
    expect(findLexical("WATER")?.id).toBe("w:water");
    expect(findLexical("w:does-not-exist")).toBeNull();
  });

  it("keeps Day 1-7 lesson words canonical inside the merged model", () => {
    const hi = findLexical("w:hi");
    expect(hi?.zh).toContain("你好");
    expect(hi?.collocations).toContain("say hi");
  });
});
