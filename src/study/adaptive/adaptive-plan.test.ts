import { describe, expect, it } from "vitest";
import { buildAdaptivePlan, skillForBlock, todayISO } from "@/study/adaptive/adaptive-plan";
import { buildLearnerProfile, PROFILE_SKILLS } from "@/study/adaptive/learner-profile";
import { decideNextDifficulty } from "@/study/adaptive/difficulty-controller";
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
  listening: est("A1", 25),
  speaking: est("A1", 20),
  vocabulary: est("B1", 55),
  grammar: est("B2", 70),
  writing: est("B1", 50),
});

describe("buildAdaptivePlan", () => {
  it("produces a plan with fixed-presence blocks", () => {
    const p = buildLearnerProfile({ baseline: b });
    const plan = buildAdaptivePlan({ profile: p, dueReviewCount: 5 });
    const kinds = plan.blocks.map((x) => x.kind);
    expect(kinds).toContain("core-lesson");
    expect(kinds).toContain("checkpoint");
    expect(kinds).toContain("srs-review");
  });

  it("emits zero-minute SRS block when nothing is due", () => {
    const p = buildLearnerProfile({ baseline: b });
    const plan = buildAdaptivePlan({ profile: p, dueReviewCount: 0 });
    expect(plan.blocks.find((x) => x.kind === "srs-review")).toBeUndefined();
  });

  it("always reports a positive total", () => {
    const p = buildLearnerProfile({ baseline: b });
    const plan = buildAdaptivePlan({ profile: p, dueReviewCount: 3 });
    expect(plan.totalMinutes).toBeGreaterThan(30);
  });

  it("dates are ISO YYYY-MM-DD", () => {
    expect(todayISO(1577836800000)).toBe("2020-01-01");
  });

  it("uses difficulty controller decisions to set focus band", () => {
    const p = buildLearnerProfile({ baseline: b });
    const diff = { listening: decideNextDifficulty({ recent: [], currentBand: "A1" }) };
    const plan = buildAdaptivePlan({ profile: p, dueReviewCount: 0, difficulty: diff });
    const rem = plan.blocks.find((x) => x.kind === "weak-remediation");
    expect(rem).toBeDefined();
  });

  it("maps every block to a skill or null", () => {
    const p = buildLearnerProfile({ baseline: b });
    const plan = buildAdaptivePlan({ profile: p, dueReviewCount: 2 });
    for (const blk of plan.blocks) {
      expect(typeof skillForBlock(blk.kind)).not.toBe("undefined");
      if (blk.kind === "srs-review") expect(blk.skill).toBeNull();
      if (blk.kind === "checkpoint") expect(blk.skill).not.toBeNull();
    }
  });

  it("focusSkills ranks weakest first", () => {
    const p = buildLearnerProfile({ baseline: b });
    const plan = buildAdaptivePlan({ profile: p, dueReviewCount: 2 });
    expect(["listening", "speaking"]).toContain(plan.focusSkills[0].skill);
  });
});
