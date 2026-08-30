import { describe, expect, it } from "vitest";
import {
  computeDelta,
  adjustPlanFrom,
  isCheckpointDay,
  nextCheckpoint,
  CHECKPOINT_DAYS,
} from "@/study/adaptive/reassessment";
import type { AbilityEstimate } from "@/study/validation/adaptive";

const a1: AbilityEstimate = { level: "A1", rating: 10, score: 10, confidence: 0.6, trials: 4, correct: 1 };
const b1: AbilityEstimate = { level: "B1", rating: 50, score: 50, confidence: 0.6, trials: 9, correct: 6 };

describe("computeDelta", () => {
  it("reports a positive band delta", () => {
    const r = computeDelta({
      scope: "skill", checkpointDay: 30, timestamp: 2000, beforeTime: 1000,
      before: a1, after: b1, skillsDelta: { listening: 2 },
    });
    expect(r.delta).toBeGreaterThan(0);
    expect(r.timeElapsedMs).toBe(1000);
    expect(r.noteZh).toContain("提升");
  });

  it("reports a negative delta and keeps the learner out of downgrade-crush", () => {
    const r = computeDelta({
      scope: "full", checkpointDay: 60, timestamp: 5000, beforeTime: 4000,
      before: b1, after: a1, skillsDelta: { speaking: -2 },
    });
    expect(r.delta).toBeLessThan(0);
    expect(r.noteZh).toContain("回落");
  });

  it("records item count and productive ratio", () => {
    const r = computeDelta({
      scope: "micro", checkpointDay: 1, timestamp: 3000, beforeTime: 2000,
      before: a1, after: b1, productiveCorrectAfter: 5,
    });
    expect(r.itemCount).toBe(9);
    expect(r.productiveRatio).toBeGreaterThan(0);
  });
});

describe("adjustPlanFrom", () => {
  it("flags the regressed skill for next plan", () => {
    const r = computeDelta({
      scope: "full", checkpointDay: 30, timestamp: 2000, beforeTime: 1000,
      before: a1, after: b1, skillsDelta: { listening: 1, speaking: -2, writing: -1 },
    });
    const adj = adjustPlanFrom(r);
    expect(adj.focusSkill).toBe("speaking");
    expect(adj.boost).toBeGreaterThan(0);
  });

  it("returns no boost when all skills improve", () => {
    const r = computeDelta({
      scope: "full", checkpointDay: 30, timestamp: 2000, beforeTime: 1000,
      before: a1, after: b1, skillsDelta: { listening: 1, speaking: 1 },
    });
    const adj = adjustPlanFrom(r);
    expect(adj.focusSkill).toBeNull();
    expect(adj.boost).toBe(0);
  });
});

describe("schedule", () => {
  it("recognises mandated checkpoints", () => {
    for (const d of CHECKPOINT_DAYS) expect(isCheckpointDay(d)).toBe(true);
    expect(isCheckpointDay(17)).toBe(false);
  });
  it("finds the next checkpoint", () => {
    expect(nextCheckpoint(1, 1)).toBe(7);
    expect(nextCheckpoint(1, 90)).toBe(180);
  });
});
