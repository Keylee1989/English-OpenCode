import { describe, expect, it } from "vitest";
import {
  decideNextDifficulty,
  CEFR_LIST,
  difficultyForBand,
} from "@/study/adaptive/difficulty-controller";
import type { DifficultyOutcome, DifficultyInput } from "@/study/adaptive/difficulty-controller";

function seq(n: number, correct: boolean[]): DifficultyOutcome[] {
  const out: DifficultyOutcome[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ correct: correct[i] ?? true });
  }
  return out;
}

describe("difficultyForBand", () => {
  it("maps A1 low, C2 high", () => {
    expect(difficultyForBand("A1")).toBeLessThan(difficultyForBand("C2"));
  });
});

describe("decideNextDifficulty", () => {
  it("promotes after a strong streak", () => {
    const r = decideNextDifficulty({ recent: seq(4, [true, true, true, true]), currentBand: "B1" });
    expect(r.nextBand).toBe("B2");
    expect(r.decision).toBe("too_easy");
  });

  it("does not promote on a single correct", () => {
    const r = decideNextDifficulty({ recent: seq(1, [true]), currentBand: "B1" });
    expect(r.nextBand).toBe("B1");
  });

  it("holds in the middle", () => {
    const r = decideNextDifficulty({
      recent: seq(4, [true, false, true, true]),
      currentBand: "B1",
    });
    expect(r.nextBand).toBe("B1");
  });

  it("remediates (drops one band) on sustained failure", () => {
    const r = decideNextDifficulty({ recent: seq(4, [false, true, false, false]), currentBand: "C1" });
    expect(r.nextBand).toBe("B2");
    expect(r.decision).toBe("hard");
  });

  it("never drops below A1", () => {
    const r = decideNextDifficulty({ recent: seq(4, [false, false, false, false]), currentBand: "A1" });
    expect(r.nextBand).toBe("A1");
  });

  it("never promotes above C2", () => {
    const r = decideNextDifficulty({ recent: seq(6, [true, true, true, true, true, true]), currentBand: "C2" });
    expect(r.nextBand).toBe("C2");
  });

  it("moves at most one band at a time", () => {
    for (const band of CEFR_LIST) {
      const r = decideNextDifficulty({ recent: seq(6, [false, false, false, false, false, false]), currentBand: band });
      const from = CEFR_LIST.indexOf(band);
      const to = CEFR_LIST.indexOf(r.nextBand);
      expect(Math.abs(from - to)).toBeLessThanOrEqual(1);
    }
  });

  it("respects a high self-reported hardness by not escalating", () => {
    const r = decideNextDifficulty({
      recent: seq(4, [true, true, true, true]),
      currentBand: "B2",
      selfReportedHardness: 0.9,
    });
    expect(r.nextBand).toBe("B1");
  });

  it("is deterministic", () => {
    const input: DifficultyInput = { recent: seq(5, [true, true, false, true, true]), currentBand: "B1" };
    const a = decideNextDifficulty(input);
    const b = decideNextDifficulty(input);
    expect(a).toEqual(b);
  });
});
