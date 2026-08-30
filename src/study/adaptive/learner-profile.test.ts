import { describe, expect, it } from "vitest";
import { buildLearnerProfile, skillGap, PROFILE_SKILLS } from "@/study/adaptive/learner-profile";
import type { BaselineResult } from "@/study/validation/baseline-model";
import type { AbilityEstimate } from "@/study/validation/adaptive";
import type { SkillKey } from "@/core/types";

function est(level: AbilityEstimate["level"], score: number, trials = 10, confidence = 0.6): AbilityEstimate {
  return { level, rating: score, score, confidence, trials: 9, correct: Math.max(0, trials - 1) };
}

function baseline(skills: Partial<Record<SkillKey, AbilityEstimate>>): BaselineResult {
  const all = Object.fromEntries(
    PROFILE_SKILLS.map((s) => [s, est("A1", 20)]),
  ) as Record<SkillKey, AbilityEstimate>;
  for (const [k, v] of Object.entries(skills)) {
    all[k as SkillKey] = v as AbilityEstimate;
  }
  return {
    version: 7,
    timestamp: 1,
    overall: est("B1", 50),
    skills: all,
    testedItems: [],
    stats: { probes: 9, correct: 4 },
    limitations: [],
  };
}

describe("skillGap", () => {
  it("returns 0 when at reference", () => {
    expect(skillGap(3, 3)).toBe(0);
  });
  it("returns positive for below reference", () => {
    expect(skillGap(1, 4)).toBeGreaterThan(0);
  });
  it("handles full gap", () => {
    expect(skillGap(0, 2)).toBeCloseTo(1, 5);
  });
});

describe("buildLearnerProfile", () => {
  const b = baseline({
    reading: est("C1", 80),
    vocabulary: est("B1", 55),
    grammar: est("B2", 70),
    writing: est("B1", 50),
    listening: est("A1", 25),
    speaking: est("A1", 20, 2, 0.2),
  });

  it("maps per-skill bands", () => {
    const p = buildLearnerProfile({ baseline: b });
    expect(p.currentSkillBand.reading).toBe("C1");
    expect(p.currentSkillBand.listening).toBe("A1");
  });

  it("flags self-reported skills honestly", () => {
    const p = buildLearnerProfile({
      baseline: b,
      selfReportedSkills: ["speaking", "writing"],
    });
    expect(p.skills.find((s) => s.skill === "speaking")?.selfReported).toBe(true);
    expect(p.skills.find((s) => s.skill === "writing")?.selfReported).toBe(true);
    expect(p.skills.find((s) => s.skill === "reading")?.selfReported).toBe(false);
  });

  it("identifies weakest and strongest", () => {
    const p = buildLearnerProfile({ baseline: b });
    expect(p.weakestSkills.some((s) => s.skill === "listening")).toBe(true);
    expect(p.strongestSkills.some((s) => s.skill === "reading")).toBe(true);
  });

  it("computes recept/productive gap from student-model signals", () => {
    const p = buildLearnerProfile({
      baseline: b,
      receptiveAbility: { reading: 80 },
      productiveAbility: { reading: 30 },
    });
    expect(p.receptiveProductiveGap).toBeGreaterThan(0.5);
  });

  it("recommends high intensity for large gaps", () => {
    const p = buildLearnerProfile({ baseline: b });
    expect(["light", "moderate", "high"]).toContain(p.recommendedIntensity);
  });

  it("adds honesty note when speaking is self-reported", () => {
    const p = buildLearnerProfile({ baseline: b, selfReportedSkills: ["speaking"] });
    expect(p.notesZh.join(" ")).toContain("非客观测试");
  });
});
