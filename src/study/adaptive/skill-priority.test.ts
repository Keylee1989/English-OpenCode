import { describe, expect, it } from "vitest";
import {
  skillWeight,
  normalizedPriorities,
  isBottleneck,
  ORAL_BOOST,
} from "@/study/adaptive/skill-priority";
import { buildLearnerProfile, PROFILE_SKILLS } from "@/study/adaptive/learner-profile";
import type { BaselineResult } from "@/study/validation/baseline-model";
import type { AbilityEstimate } from "@/study/validation/adaptive";
import type { SkillKey } from "@/core/types";

function est(level: AbilityEstimate["level"], score: number): AbilityEstimate {
  return { level, rating: score, score, confidence: 0.7, trials: 9, correct: 8 };
}

function baseline(skills: Partial<Record<SkillKey, AbilityEstimate>>): BaselineResult {
  const all = Object.fromEntries(PROFILE_SKILLS.map((s) => [s, est("A1", 20)])) as Record<SkillKey, AbilityEstimate>;
  for (const [k, v] of Object.entries(skills)) all[k as SkillKey] = v as AbilityEstimate;
  return {
    version: 7, timestamp: 1,
    overall: est("B1", 50), skills: all, testedItems: [],
    stats: { probes: 9, correct: 4 }, limitations: [],
  };
}

const b = baseline({
  reading: est("C1", 80),
  grammar: est("B2", 70),
  writing: est("B1", 50),
  listening: est("A1", 25),
  speaking: est("A1", 20),
  vocabulary: est("B1", 55),
});

describe("skillWeight", () => {
  it("ranks weakest skills highest", () => {
    const p = buildLearnerProfile({ baseline: b });
    const sorted = skillWeight(p);
    const first = sorted[0].skill;
    expect(["listening", "speaking"]).toContain(first);
  });

  it("boosts oral production skills", () => {
    expect(ORAL_BOOST.listening).toBeGreaterThan(1);
    expect(ORAL_BOOST.speaking).toBeGreaterThan(1);
  });
});

describe("normalizedPriorities", () => {
  it("weights sum to 1", () => {
    const p = buildLearnerProfile({ baseline: b });
    const a = normalizedPriorities(p);
    const sum = a.reduce((x, y) => x + y.weight, 0);
    expect(sum).toBeCloseTo(1, 3);
  });

  it("applies a floor so no skill is zeroed", () => {
    const p = buildLearnerProfile({ baseline: b });
    const a = normalizedPriorities(p);
    for (const x of a) expect(x.weight).toBeGreaterThanOrEqual(0.04);
  });
});

describe("isBottleneck", () => {
  it("flags the top gap skill", () => {
    const p = buildLearnerProfile({ baseline: b });
    const sorted = skillWeight(p);
    expect(isBottleneck(p, sorted[0].skill)).toBe(true);
  });
});
