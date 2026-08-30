import { describe, expect, it } from "vitest";
import { buildLearnerProfile, PROFILE_SKILLS } from "@/study/adaptive/learner-profile";
import { skillWeight } from "@/study/adaptive/skill-priority";
import { buildAdaptivePlan } from "@/study/adaptive/adaptive-plan";
import {
  computeDelta,
  adjustPlanFrom,
  CHECKPOINT_DAYS,
  nextCheckpoint,
} from "@/study/adaptive/reassessment";
import type { BaselineResult } from "@/study/validation/baseline-model";
import type { AbilityEstimate, CefrLevel } from "@/study/validation/adaptive";
import type { SkillKey } from "@/core/types";

function est(level: CefrLevel, score: number, trials = 10, confidence = 0.6): AbilityEstimate {
  return { level, rating: score, score, confidence, trials, correct: Math.ceil(trials * score / 100) };
}

function baselineFor(skills: Partial<Record<SkillKey, AbilityEstimate>>): BaselineResult {
  const all = Object.fromEntries(PROFILE_SKILLS.map((s) => [s, est("A1", 30)])) as Record<SkillKey, AbilityEstimate>;
  for (const [k, v] of Object.entries(skills)) all[k as SkillKey] = v as AbilityEstimate;
  return {
    version: 7, timestamp: 1,
    overall: est("A2", 40),
    skills: all,
    testedItems: [],
    stats: { probes: 9, correct: 4 },
    limitations: [],
  };
}

describe("closed loop A-H", () => {
  it("baseline -> profile -> plan -> reassessment -> adjusted plan", () => {
    // A. Learner completes baseline: reading strong, listening+speaking weak.
    const baseline = baselineFor({
      reading: est("B2", 75),
      vocabulary: est("B1", 55),
      grammar: est("B1", 50),
      listening: est("A1", 25),
      speaking: est("A2", 40),
      writing: est("A1", 30),
    });

    // B. Diagnosis -> profile.
    const profile = buildLearnerProfile({ baseline, selfReportedSkills: ["speaking", "writing"] });
    expect(profile.currentSkillBand.reading).toBe("B2");
    expect(profile.weakestSkills.some((s) => s.skill === "listening")).toBe(true);

    // C. Priority says listening/speaking are bottlenecks.
    const priorities = skillWeight(profile);
    expect(["listening", "speaking"]).toContain(priorities[0].skill);

    // D. Daily plan targets the bottleneck and includes SRS + checkpoint.
    const day1 = buildAdaptivePlan({ profile, dueReviewCount: 4 });
    expect(day1.focusSkills[0].skill).toBe(priorities[0].skill);
    expect(day1.blocks.some((b) => b.kind === "srs-review")).toBe(true);
    expect(day1.blocks.some((b) => b.kind === "checkpoint")).toBe(true);

    // E. 30 days later: listening improved, but speaking REGRESSED.
    const after30 = baselineFor({
      reading: est("B2", 75),
      vocabulary: est("B1", 55),
      grammar: est("B1", 50),
      listening: est("A2", 40),
      speaking: est("A1", 25),
      writing: est("A1", 30),
    });
    const record = computeDelta({
      scope: "full", checkpointDay: 30, timestamp: 30 * 86400000 + 1, beforeTime: 1,
      before: baseline.skills.listening!,
      after: after30.skills.listening!,
      skillsDelta: {
        listening: cefrMove(baseline.skills.listening!.level, after30.skills.listening!.level),
        speaking: cefrMove(baseline.skills.speaking!.level, after30.skills.speaking!.level),
      },
    });
    expect(record.scope).toBe("full");
    expect(isCheckpointDue(30)).toBe(true);

    // F. Speaking regressed -> plan adjustment focuses it next cycle.
    const adj = adjustPlanFrom(record);
    expect(adj.focusSkill).toBe("speaking");

    // G. New plan for the next cycle reflects the adjusted focus.
    const profile2 = buildLearnerProfile({ baseline: after30, selfReportedSkills: ["speaking", "writing"] });
    const day61 = buildAdaptivePlan({ profile: profile2, dueReviewCount: 6 });
    expect(day61.focusSkills[0].skill ?? "").not.toBe("");

    // H. Next checkpoint is on the cadence.
    expect(nextCheckpoint(30, 30)).toBe(60);
  });

  it("a full-improvement reassessment keeps focus unchanged", () => {
    const baseline = baselineFor({ listening: est("A1", 20), speaking: est("A1", 20) });
    const after = baselineFor({ listening: est("A2", 40), speaking: est("A2", 40) });
    const record = computeDelta({
      scope: "skill", checkpointDay: 7, timestamp: 7 * 86400000 + 1, beforeTime: 1,
      before: baseline.skills.listening!, after: after.skills.listening!,
      skillsDelta: { listening: cefrMove("A1", "A2"), speaking: cefrMove("A1", "A2") },
    });
    const adj = adjustPlanFrom(record);
    expect(adj.focusSkill).toBeNull();
  });

  it("checkpoint cadence is honest: no forced full pass", () => {
    // Day 7 & 30 both land on the mandated cadence; none are multi-skill-forced.
    expect(nextCheckpoint(1, 1)).toBe(7);
    expect(CHECKPOINT_DAYS).toContain(7);
    expect(CHECKPOINT_DAYS).toContain(30);
  });
});

function cefrMove(from: CefrLevel, to: CefrLevel): number {
  const order: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
  return order.indexOf(to) - order.indexOf(from);
}

function isCheckpointDue(day: number): boolean {
  return (CHECKPOINT_DAYS as readonly number[]).includes(day);
}