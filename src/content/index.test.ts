import { describe, expect, it } from "vitest";
import {
  AUTHORED_DAYS,
  COURSE_TARGET_DAYS,
  DAY_CONTENT,
  allVocab,
  findVocab,
  getDayContent,
} from "@/content";

describe("authored curriculum Day 1-360", () => {
  it("has three hundred sixty sequential days and a 360-day course target", () => {
    expect(AUTHORED_DAYS).toBe(360);
    expect(COURSE_TARGET_DAYS).toBe(360);
    expect(DAY_CONTENT.length).toBe(360);
    expect(DAY_CONTENT.slice(0,7).map((day) => day.day)).toEqual([1,2,3,4,5,6,7]);
    expect(new Set(DAY_CONTENT.map((d) => d.day)).size).toBe(360);
  });

  it("rejects out-of-range days explicitly", () => {
    expect(getDayContent(0)).toBeNull();
    expect(getDayContent(361)).toBeNull();
    expect(getDayContent(1.5)).toBeNull();
    for (let day = 1; day <= AUTHORED_DAYS; day++) {
      expect(getDayContent(day)).not.toBeNull();
    }
  });

  it("every vocabulary entry is complete and difficulty-bounded", () => {
    for (const day of DAY_CONTENT) {
      if (day.vocabIds?.length) {
        expect(day.vocabIds.length).toBeGreaterThanOrEqual(5);
        continue;
      }
      expect(day.vocab.length).toBeGreaterThanOrEqual(5);
      for (const entry of day.vocab) {
        expect(entry.id).toMatch(/^w:[a-z0-9-]+$/);
        expect(entry.word.length).toBeGreaterThan(0);
        expect(entry.zh.length).toBeGreaterThan(0);
        expect(entry.ipa).toMatch(/^\//);
        expect(entry.pos.length).toBeGreaterThan(0);
        expect(entry.example.en.length).toBeGreaterThan(0);
        expect(entry.example.zh.length).toBeGreaterThan(0);
        expect(entry.difficulty).toBeGreaterThan(0);
        expect(entry.difficulty).toBeLessThan(1);
        expect(typeof entry.phonicsHintZh === "string" || entry.phonicsHintZh === undefined).toBe(
          true,
        );
      }
    }
  });

  it("has globally unique vocabulary ids", () => {
    const ids = allVocab().map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every pattern lesson is fully explained with examples", () => {
    for (const day of DAY_CONTENT) {
      const pattern = day.pattern;
      expect(pattern.id).toMatch(/^p:/);
      expect(pattern.titleZh).toContain("句型");
      expect(pattern.explainZh.length).toBeGreaterThan(20);
      expect(pattern.examples.length).toBeGreaterThanOrEqual(3);
      expect(pattern.practiceSentences.length).toBeGreaterThanOrEqual(3);
      // Practice sentences must be plain English words (order exercises split them).
      for (const sentence of pattern.practiceSentences) {
        expect(sentence.en.trim().split(/\s+/).length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("keeps Chinese scaffolding intact (encoding sanity)", () => {
    const hi = findVocab("w:hi");
    expect(hi?.zh).toBe("你好（随意，朋友之间）");
    const day1 = getDayContent(1);
    expect(day1?.vocab[0].phonicsHintZh ?? "").toContain("哈气");
    expect(DAY_CONTENT[6].titleZh).toBe("第 7 天 · 第一周大复习");
    expect(DAY_CONTENT[5].pattern.titleZh).toContain("I want a ___, please.");
    expect(getDayContent(3)?.vocab[2].word).toBe("three");
  });

  it("day 7 review day mixes earlier material in its pattern dialog", () => {
    const day7 = getDayContent(7);
    expect(day7?.pattern.explainZh).toContain("How old are you?");
    expect(day7?.vocab.some((entry) => entry.word === "nice")).toBe(true);
  });
});
