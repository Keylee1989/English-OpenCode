import { describe, expect, it } from "vitest";
import { decode, explainWordZh } from "@/phonics/decode";
import { buildDiscriminationDrill } from "@/phonics/drills";
import { PHONICS_OVERRIDES, PHONICS_RULES, findRule } from "@/phonics/rules";
import { gradeExercise } from "@/study/grade";

describe("Phonics System v0 - decode engine", () => {
  it("has a non-trivial rule library with unique ids", () => {
    expect(PHONICS_RULES.length).toBeGreaterThanOrEqual(30);
    const ids = new Set(PHONICS_RULES.map((rule) => rule.id));
    expect(ids.size).toBe(PHONICS_RULES.length);
    for (const rule of PHONICS_RULES) {
      expect(rule.graphemes.length).toBeGreaterThan(0);
      expect(rule.phoneme.startsWith("/")).toBe(true);
      expect(rule.tipZh.length).toBeGreaterThan(4);
    }
  });

  it("decodes regular words via longest-grapheme matching", () => {
    const result = decode("three");
    const phonemes = result.segments.map((segment) => segment.phoneme);
    expect(phonemes).toContain("/θ/");
    expect(phonemes).toContain("/iː/");
    // th matched as one digraph, not t + h
    const th = result.segments.find((segment) => segment.grapheme === "th");
    expect(th?.ruleId).toBe("th-vl");
    expect(result.coverage).toBeGreaterThan(0.8);
  });

  it("uses word overrides for irregular high-frequency words", () => {
    expect(findRule("never-matches")).toBeUndefined();
    expect(Object.keys(PHONICS_OVERRIDES)).toContain("one");
    const one = decode("one");
    expect(one.segments[0]?.phoneme).toBe("/wʌn/");
    expect(one.coverage).toBeGreaterThan(0);

    const good = decode("good");
    expect(good.segments.some((s) => s.phoneme === "/ʊ/")).toBe(true);
  });

  it("surfaces uncovered letters honestly instead of guessing", () => {
    // 'x' has no rule in the v0 library
    const result = decode("box");
    expect(result.uncovered).toContain("x");
    expect(result.coverage).toBeLessThan(1);
  });

  it("explains words as readable Chinese lines", () => {
    const line = explainWordZh("she");
    expect(line).toContain("sh /ʃ/");
    expect(line).toContain("+");
  });
});

describe("Phonics System v0 - discrimination drills", () => {
  it("builds deterministic minimal-pair drills", () => {
    const a = buildDiscriminationDrill("pair-eat-it");
    const b = buildDiscriminationDrill("pair-eat-it");
    expect(a).not.toBeNull();
    expect(a).toEqual(b);
    expect(a?.optionsEn).toEqual(["eat", "it"]);
    expect([a?.targetWord, a?.optionsEn[a?.answerIndex ?? 0]]).toHaveLength(2);
    expect(a?.targetWord).toBe(a?.optionsEn[a?.answerIndex ?? 0]);
    expect(a?.requiresAudio).toBe(true);
    expect(a?.tipZh.length).toBeGreaterThan(0);
  });

  it("returns null for unknown pairs or pairs with missing vocab", () => {
    expect(buildDiscriminationDrill("pair-nope")).toBeNull();
  });

  it("grades correctly when the learner picks the spoken word", () => {
    const drill = buildDiscriminationDrill("pair-work-walk");
    if (!drill) throw new Error("drill missing");
    expect(
      gradeExercise(drill, { kind: "choice", index: drill.answerIndex }).correct,
    ).toBe(true);
    expect(
      gradeExercise(drill, {
        kind: "choice",
        index: drill.answerIndex === 0 ? 1 : 0,
      }).correct,
    ).toBe(false);
  });
});
