import { describe, expect, it } from "vitest";
import { DAY_CONTENT, getDayContent, getDayVocabulary } from "@/content";
import { GRAMMAR_TOPICS } from "@/engines/grammar/topics";
import { PHONICS_RULES, MINIMAL_PAIRS } from "@/phonics/rules";

describe("curriculum integrity (Day 31+)", () => {
  const pipelineDays = DAY_CONTENT.filter((day) => day.day >= 31);

  it("has sequential days starting at 31", () => {
    for (let i = 0; i < pipelineDays.length; i++) {
      expect(pipelineDays[i].day).toBe(31 + i);
    }
    expect(DAY_CONTENT.length).toBeGreaterThanOrEqual(137);
  });

  it("every day has complete hooks", () => {
    for (const day of pipelineDays) {
      expect(day.pattern.examples.length, `${day.day} ex`).toBeGreaterThanOrEqual(3);
      expect(getDayVocabulary(day).length, `${day.day} vocab`).toBeGreaterThanOrEqual(5);
      expect(day.grammarTopicId, `${day.day} grammar`).toBeTruthy();
      expect((day.reading?.length ?? 0), `${day.day} reading`).toBeGreaterThanOrEqual(1);
      expect(day.writingPrompt?.zh.length ?? 0, `${day.day} writing`).toBeGreaterThan(0);
    }
  });

  it("grammar and phonics refs resolve", () => {
    const topics = new Set(GRAMMAR_TOPICS.map((t) => t.id));
    const rules = new Set(PHONICS_RULES.map((r) => r.id));
    const pairs = new Set(MINIMAL_PAIRS.map((p) => p.id));
    for (const day of pipelineDays) {
      expect(topics.has(day.grammarTopicId!), `${day.day} grammar`).toBe(true);
      for (const rid of day.phonicsFocus?.ruleIds ?? []) {
        expect(rules.has(rid), `${day.day} rule ${rid}`).toBe(true);
      }
      for (const pid of day.phonicsFocus?.pairIds ?? []) {
        expect(pairs.has(pid), `${day.day} pair ${pid}`).toBe(true);
      }
    }
  });

  it("vocab ids resolve", () => {
    for (const day of pipelineDays) {
      expect(getDayVocabulary(day).length, `${day.day}`).toBe(
        day.vocabIds?.length ?? day.vocab.length
      );
    }
  });
});

describe("getDayContent boundary", () => {
  it("serves up to max and rejects beyond", () => {
    const last = DAY_CONTENT.length;
    expect(getDayContent(last)).not.toBeNull();
    expect(getDayContent(last + 1)).toBeNull();
  });
});
