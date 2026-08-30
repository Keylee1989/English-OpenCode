import { describe, expect, it } from "vitest";
import { PHASE2_PLAN, getPhase2Block, PHASE2_DAY_181 } from "@/content/phase2-plan";

describe("Phase 2 (Day 181-360) progression architecture (P0-7)", () => {
  it("defines a full, non-empty, contiguous 180-day plan", () => {
    expect(PHASE2_PLAN.totalDays).toBe(180);
    expect(PHASE2_PLAN.startDay).toBe(181);
    expect(PHASE2_PLAN.endDay).toBe(360);
    // Contiguous coverage with no gaps: block i end == next block start - 1.
    for (let i = 0; i < PHASE2_PLAN.blocks.length - 1; i++) {
      expect(PHASE2_PLAN.blocks[i].dayEnd).toBe(PHASE2_PLAN.blocks[i + 1].dayStart - 1);
    }
    const first = PHASE2_PLAN.blocks[0].dayStart;
    const last = PHASE2_PLAN.blocks[PHASE2_PLAN.blocks.length - 1].dayEnd;
    expect(first).toBe(181);
    expect(last).toBe(360);
  });

  it("every block has milestones within Assessment core milestones", () => {
    for (const b of PHASE2_PLAN.blocks) {
      expect(b.milestones.length).toBeGreaterThan(0);
      for (const m of b.milestones) {
        expect(m).toBeGreaterThanOrEqual(b.dayStart);
        expect(m).toBeLessThanOrEqual(b.dayEnd);
      }
    }
  });

  it("target CEFR drift is monotonic B2 -> C2 (honest, no backtracking)", () => {
    const order = ["B2", "B2+", "C1", "C1+", "C2"];
    let prev = -1;
    for (const b of PHASE2_PLAN.blocks) {
      const idx = order.indexOf(b.targetLevel);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeGreaterThanOrEqual(prev);
      prev = idx;
    }
  });

  it("getPhase2Block resolves the correct block for boundary days", () => {
    expect(getPhase2Block(180)).toBeNull();
    expect(getPhase2Block(181)?.block).toBe(1);
    expect(getPhase2Block(210)?.block).toBe(1);
    expect(getPhase2Block(211)?.block).toBe(2);
    expect(getPhase2Block(360)?.block).toBe(6);
    expect(getPhase2Block(361)).toBeNull();
  });

  it("Day 181 entry point is real and traces to block 1", () => {
    expect(PHASE2_DAY_181.day).toBe(181);
    expect(PHASE2_DAY_181.block).toBe(1);
    expect(getPhase2Block(PHASE2_DAY_181.day)?.block).toBe(PHASE2_DAY_181.block);
  });
});
