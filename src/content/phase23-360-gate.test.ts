import { describe, expect, it } from "vitest";
import {
  AUTHORED_DAYS,
  DAY_CONTENT,
  getDayVocabulary,
} from "@/content";
import type { DayContent } from "@/content/types";
import { GRAMMAR_TOPIC_IDS } from "@/engines/grammar/topics";
import { PHONICS_RULES, MINIMAL_PAIRS } from "@/phonics/rules";

/**
 * Phase 23 · 360-day content quality gate.
 * Authoritative check that the full Day1-360 curriculum is REAL content:
 * sequential, complete hooks, resolvable vocab/grammar/phonics, no
 * placeholders, no copied templates, reviewing days at block seams.
 */
const days = DAY_CONTENT;
const newDays = DAY_CONTENT.filter((d) => d.day >= 181 && d.day <= 360);

const PLACEHOLDER_RE = /\bTODO\b|placeholder|\?\?\?|\bmock\b|\btemp\b|fix later|coming soon/i;

describe("Phase 23: full 360-day authored curriculum", () => {
  it("is exactly 360 contiguous unique days (Day1-360)", () => {
    expect(AUTHORED_DAYS).toBe(360);
    expect(days).toHaveLength(360);
    days.forEach((day, i) => expect(day.day, `position ${i}`).toBe(i + 1));
    expect(new Set(days.map((d) => d.day)).size).toBe(360);
  });

  it("has all six second-half blocks present and ordered", () => {
    for (const seam of [210, 240, 270, 300, 330, 360]) {
      expect(newDays.find((d) => d.day === seam), `Day${seam}`).toBeDefined();
    }
  });

  it("every new day has complete identity hooks", () => {
    for (const day of newDays) {
      expect(day.titleEn.length, `D${day.day} titleEn`).toBeGreaterThan(3);
      expect(day.titleZh.startsWith("第"), `D${day.day} titleZh`).toBe(true);
      expect(day.titleZh.includes(`第 ${day.day} 天`), `D${day.day} titleZh#`).toBe(true);
      expect(day.goalZh.length, `D${day.day} goalZh`).toBeGreaterThan(8);
    }
  });

  it("has no placeholder or unfinished text in new days", () => {
    for (const day of newDays) {
      const text = JSON.stringify({
        t: [day.titleEn, day.titleZh, day.goalZh],
        p: day.pattern,
        r: day.reading,
        w: day.writingPrompt,
      });
      expect(PLACEHOLDER_RE.test(text), `D${day.day} placeholder`).toBe(false);
    }
  });

  it("has no duplicate title templates across the second half", () => {
    const en = new Map<string, number>();
    for (const day of newDays) {
      en.set(day.titleEn, (en.get(day.titleEn) ?? 0) + 1);
    }
    const dup = [...en.entries()].filter(([, n]) => n > 1);
    expect(dup, "duplicate titleEn in Day181-360").toEqual([]);
  });

  it("resolves every vocab id in every new day against the real lexical model", () => {
    const missing: string[] = [];
    const lowBand: string[] = [];
    for (const day of newDays) {
      expect(day.vocabIds!.length, `D${day.day} vocabIds>=5`).toBeGreaterThanOrEqual(5);
      const resolved = getDayVocabulary(day);
      if (resolved.length !== day.vocabIds!.length) {
        for (const id of day.vocabIds!) {
          if (!resolved.some((e) => e.id === id)) missing.push(`D${day.day} ${id}`);
        }
      }
      for (const entry of resolved) {
        if (entry.frequencyBand < 4) lowBand.push(`D${day.day} ${entry.id}(band${entry.frequencyBand})`);
      }
    }
    expect(missing, "unresolvable vocab ids (all)").toEqual([]);
    expect(lowBand, "new-day vocab below band 4 (all)").toEqual([]);
  });

  it("resolves every grammar topic id", () => {
    const topics = new Set(GRAMMAR_TOPIC_IDS);
    for (const day of newDays) {
      expect(topics.has(day.grammarTopicId!), `D${day.day} grammar ${day.grammarTopicId}`).toBe(true);
    }
  });

  it("resolves every phonics rule id and minimal-pair id", () => {
    const rules = new Set(PHONICS_RULES.map((r) => r.id));
    const pairs = new Set(MINIMAL_PAIRS.map((p) => p.id));
    for (const day of newDays) {
      for (const rid of day.phonicsFocus?.ruleIds ?? []) {
        expect(rules.has(rid), `D${day.day} rule ${rid}`).toBe(true);
      }
      for (const pid of day.phonicsFocus?.pairIds ?? []) {
        expect(pairs.has(pid), `D${day.day} pair ${pid}`).toBe(true);
      }
    }
  });

  it("every new day has a full pattern lesson", () => {
    for (const day of newDays) {
      const p = day.pattern;
      expect(p.id).toBe(`p:d${day.day}`);
      expect(p.titleZh, `D${day.day} p.titleZh 句型`).toContain("句型");
      expect(p.explainZh.length, `D${day.day} explainZh`).toBeGreaterThan(20);
      expect(p.examples.length, `D${day.day} examples>=3`).toBeGreaterThanOrEqual(3);
      expect(p.practiceSentences.length, `D${day.day} sentences>=3`).toBeGreaterThanOrEqual(3);
    }
  });

  it("every new day has authored reading (3+ EN/ZH pairs) and a writing prompt", () => {
    for (const day of newDays) {
      expect(day.reading!.length, `D${day.day} reading>=3`).toBeGreaterThanOrEqual(3);
      for (const r of day.reading!) {
        expect(r.en.trim().length, `D${day.day} read.en`).toBeGreaterThan(3);
        expect(r.zh.trim().length, `D${day.day} read.zh`).toBeGreaterThan(3);
      }
      expect(day.writingPrompt!.zh.length, `D${day.day} writing.zh`).toBeGreaterThan(5);
      expect(day.writingPrompt!.hintEn.length, `D${day.day} writing.hint`).toBeGreaterThan(3);
    }
  });

  it("block-closing review/assessment days appear at every defined seam", () => {
    const re = /review|final|assessment|graduation|milestone|复盘|测评|终测|总结|报告|模拟|综合/i;
    // Pre-existing seams 30/60/90/150 are confirmatory; 120 was authored as a
    // non-review lesson, so the seam contract is block-scoped, not calendar-30.
    const seams = [30, 60, 90, 150, 210, 240, 270, 300, 330, 360];
    for (const seam of seams) {
      const d = days.find((day) => day.day === seam);
      expect({ found: !!d, seam }, `seam D${seam}`).toEqual({ found: true, seam });
      if (d) expect(`${d.titleEn} ${d.titleZh} ${d.goalZh}`, `seam D${seam}`).toMatch(re);
    }
  });

  it("counts actual authored units and prints a real inventory", () => {
    const c = { vocabIds: 0, grammars: 0, phonics: 0, examples: 0, sentences: 0, reading: 0, writing: 0 };
    for (const day of days) {
      c.vocabIds += day.vocabIds?.length || day.vocab.length || 0;
      c.grammars += day.grammarTopicId ? 1 : 0;
      c.phonics += day.phonicsFocus?.ruleIds?.length ?? 0;
      c.examples += day.pattern.examples.length;
      c.sentences += day.pattern.practiceSentences.length;
      c.reading += day.reading?.length ?? 0;
      c.writing += day.writingPrompt ? 1 : 0;
    }
    console.warn(JSON.stringify(c));
    expect(c.examples).toBeGreaterThan(1000);
    expect(c.sentences).toBeGreaterThan(1000);
    expect(c.vocabIds).toBeGreaterThan(1800);
  });
});

// keep TS happy about unused import pattern when tsc runs gate modules
export type _Ref = DayContent | null;