import { describe, expect, it } from "vitest";
import {
  GRAMMAR_C2_CATEGORIES,
  GRAMMAR_C2_TOPICS,
  getGrammarC2Topics,
  type GrammarC2Category,
} from "@/content/grammar/c2/grammar-c2";

describe("C2 Grammar Master System (Phase 15-B)", () => {
  it("covers every required category", () => {
    const required = [
      "sentence-structure",
      "verb-system",
      "advanced-clauses",
      "subjunctive",
      "passive-system",
      "academic-writing",
      "advanced-structures",
    ];
    expect([...GRAMMAR_C2_CATEGORIES].sort()).toEqual([...required].sort());
    for (const category of required) {
      expect(getGrammarC2Topics(category as GrammarC2Category).length, category).toBeGreaterThanOrEqual(1);
    }
  });

  it("has unique topic ids and complete teaching fields", () => {
    const ids = new Set(GRAMMAR_C2_TOPICS.map((topic) => topic.id));
    expect(ids.size).toBe(GRAMMAR_C2_TOPICS.length);
    for (const topic of GRAMMAR_C2_TOPICS) {
      expect(topic.explanationZh.length, topic.id).toBeGreaterThan(20);
      expect(topic.patterns.length, topic.id).toBeGreaterThanOrEqual(1);
      expect(topic.examples.length, topic.id).toBeGreaterThanOrEqual(1);
    }
  });

  it("includes the spec-mandated signature structures", () => {
    const ids = GRAMMAR_C2_TOPICS.map((topic) => topic.id).join("|");
    // subjunctive
    expect(ids).toMatch(/subjunctive/);
    // modal perfect (could have been overlooked family)
    const modalPerfect = GRAMMAR_C2_TOPICS.find((topic) => topic.id === "modal-perfect-system");
    expect(modalPerfect?.patterns.join(" ")).toMatch(/might have been|could have been/);
    // inversion (Rarely do we see...)
    const inversion = GRAMMAR_C2_TOPICS.find((topic) => topic.id === "inversion-for-emphasis");
    expect(inversion?.patterns.join(" ")).toMatch(/Rarely/);
  });
});
