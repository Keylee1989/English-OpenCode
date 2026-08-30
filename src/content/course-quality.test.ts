import { describe, expect, it } from "vitest";
import { AUTHORED_DAYS, DAY_CONTENT, getDayVocabulary } from "@/content";
import { GRAMMAR_TOPICS } from "@/engines/grammar/topics";
import { PHONICS_RULES, MINIMAL_PAIRS } from "@/phonics/rules";

/** Phase 10-B: full-curriculum quality gates for Day 1-360. */
describe("course quality (Day 1-360)", () => {
  const days = DAY_CONTENT;

  it("authors exactly 360 contiguous unique days", () => {
    expect(AUTHORED_DAYS).toBe(360);
    expect(days).toHaveLength(360);
    days.forEach((day, i) => expect(day.day, `position ${i}`).toBe(i + 1));
  });

  it("has Day151 (Advanced Communication I)", () => {
    const d = days.find((day) => day.day === 151);
    expect(d).toBeDefined();
    expect(d!.titleEn.length).toBeGreaterThan(0);
    expect(d!.vocabIds?.length ?? 0).toBeGreaterThanOrEqual(5);
  });

  it("has Day180 (Final Growth Report & Graduation)", () => {
    const d = days.find((day) => day.day === 180);
    expect(d).toBeDefined();
    expect(d!.titleEn + " " + d!.goalZh).toMatch(/growth|graduation|报告|毕业/i);
  });

  it("resolves every vocab id against the lexical model", () => {
    for (const day of days) {
      const resolved = getDayVocabulary(day);
      const expected = day.vocabIds?.length ? day.vocabIds.length : day.vocab.length;
      expect(resolved.length, `Day${day.day} vocab`).toBe(expected);
    }
  });

  it("resolves every grammar topic id", () => {
    const topics = new Set(GRAMMAR_TOPICS.map((t) => t.id));
    for (const day of days) {
      if (day.day <= 7) continue; // foundation days predate the Grammar Engine
      expect(topics.has(day.grammarTopicId!), `Day${day.day} grammar`).toBe(true);
    }
  });

  it("resolves every phonics rule and minimal-pair id", () => {
    const rules = new Set(PHONICS_RULES.map((r) => r.id));
    const pairs = new Set(MINIMAL_PAIRS.map((p) => p.id));
    for (const day of days) {
      for (const rid of day.phonicsFocus?.ruleIds ?? []) {
        expect(rules.has(rid), `Day${day.day} rule ${rid}`).toBe(true);
      }
      for (const pid of day.phonicsFocus?.pairIds ?? []) {
        expect(pairs.has(pid), `Day${day.day} pair ${pid}`).toBe(true);
      }
    }
  });

  it("contains no placeholder text in authored content", () => {
    const re = /\bTODO\b|placeholder|\?\?\?|\bmock\b|\btemp\b|fix later/i;
    for (const day of days) {
      const text = JSON.stringify({
        t: [day.titleEn, day.titleZh, day.goalZh],
        p: day.pattern,
        r: day.reading,
        w: day.writingPrompt,
      });
      expect(re.test(text), `Day${day.day} placeholder`).toBe(false);
    }
  });

  it("closes every phase with synthesis/review lessons", () => {
    const re = /review|milestone|simulation|comprehensive|growth|graduation|综合|复习|复盘|模拟|汇报/i;
    for (const sd of [30, 60, 90, 100, 110, 130, 150, 160, 170, 180, 210, 240, 270, 300, 330, 360]) {
      const d = days.find((day) => day.day === sd)!;
      expect(`${d.titleEn} ${d.titleZh} ${d.goalZh}`, `Day${sd}`).toMatch(re);
    }
  });
});
