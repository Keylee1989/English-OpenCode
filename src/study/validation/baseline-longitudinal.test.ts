import { describe, expect, it } from "vitest";
import {
  compareBaselines,
  withBaselineMetadata,
  BASELINE_SKILLS,
  type BaselineResult,
} from "@/study/validation/baseline-model";
import type { AbilityEstimate, CefrLevel } from "@/study/validation/adaptive";
import type { SkillKey } from "@/core/types";

function est(level: CefrLevel, rating: number, trials: number, confidence = 0.6): AbilityEstimate {
  return { level, rating, score: Math.round(((rating - 700) / 1200) * 1000) / 10, confidence, trials, correct: Math.ceil(trials * 0.6) };
}

function base(skills: Partial<Record<SkillKey, AbilityEstimate>>, timestamp: number): BaselineResult {
  const all = Object.fromEntries(BASELINE_SKILLS.map((s) => [s, est("A1", 800, 0, 0.1)])) as Record<SkillKey, AbilityEstimate>;
  for (const [k, v] of Object.entries(skills)) all[k as SkillKey] = v as AbilityEstimate;
  return {
    version: 7,
    timestamp,
    overall: est("A1", 800, 0, 0.1),
    skills: all,
    testedItems: ["vocab-1", "grammar-2"],
    stats: { probes: 2, correct: 1 },
    limitations: [],
  };
}

describe("withBaselineMetadata (P0-6, ADD-ONLY)", () => {
  it("derives testedSkills/questionCount/ratios/evidenceCount without changing identity", () => {
    const r = base({ vocabulary: est("A1", 800, 4), grammar: est("A2", 1000, 4) }, 1);
    const meta = withBaselineMetadata(r, { objectiveCount: 1, evidenceIds: ["a", "b", "c"] });
    expect(meta.testedSkills).toBe(2);
    expect(meta.questionCount).toBe(r.stats.probes);
    expect(meta.objectiveRatio).toBe(0.5);
    expect(meta.selfReportedRatio).toBe(0.5);
    expect(meta.objectiveRatio! + meta.selfReportedRatio!).toBeCloseTo(1);
    expect(meta.evidenceCount).toBe(3);
  });
});

describe("compareBaselines (P0-6 longitudinal)", () => {
  it("reports no comparison when baseline missing", () => {
    const c = compareBaselines(null, null);
    expect(c.hasBaseline).toBe(false);
    expect(c.overallBandDelta).toBeNull();
    expect(c.summaryZh).toContain("尚未完成基线评测");
  });

  it("reports no comparison when only baseline present", () => {
    const b = base({}, 1);
    const c = compareBaselines(b, null);
    expect(c.hasBaseline).toBe(true);
    expect(c.hasLatest).toBe(false);
    expect(c.summaryZh).toContain("首次基线");
  });

  it("computes overall + per-skill deltas (improvement)", () => {
    const b = base({ vocabulary: est("A1", 800, 5) }, 1);
    const l = base({ vocabulary: est("B1", 1200, 5) }, 2);
    l.overall = est("B1", 1200, 5);
    const c = compareBaselines(b, l);
    expect(c.overallBandDelta).toBe(2); // A1 -> B1
    const v = c.perSkill.find((d) => d.skill === "vocabulary")!;
    expect(v.bandDelta).toBe(2);
    expect(v.ratingDelta).toBe(400);
    expect(v.fromLevel).toBe("A1");
    expect(v.toLevel).toBe("B1");
    expect(c.biggestGain).toBe("vocabulary");
    expect(c.summaryZh).toContain("+2");
    expect(c.honestyZh).toContain("非官方");
  });

  it("flags regression (negative delta) as biggest loss", () => {
    const b = base({ grammar: est("B2", 1400, 5) }, 1);
    const l = base({ grammar: est("A2", 1000, 5) }, 2);
    l.overall = est("A2", 1000, 5);
    const c = compareBaselines(b, l);
    const g = c.perSkill.find((d) => d.skill === "grammar")!;
    expect(g.bandDelta).toBe(-2);
    expect(c.biggestLoss).toBe("grammar");
    expect(c.summaryZh).toContain("回落");
  });

  it("overall + rating + confidence deltas are signed and numeric", () => {
    const b = base({ listening: est("A1", 800, 5, 0.3) }, 1);
    const l = base({ listening: est("A2", 1000, 5, 0.7) }, 2);
    l.overall = est("A2", 1000, 5, 0.7);
    const c = compareBaselines(b, l);
    expect(typeof c.overallRatingDelta).toBe("number");
    expect(typeof c.overallConfidenceDelta).toBe("number");
    expect(c.overallConfidenceDelta).toBeGreaterThan(0);
    expect(c.evidenceTotal).toBe(l.testedItems.length);
  });
});
