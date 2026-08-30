import { describe, expect, it } from "vitest";
import {
  internalCefrOf,
  internalCefrFromScore,
  mergeCefrSources,
  INTERNAL_ESTIMATE_NOTE,
  SOURCE_CONFIDENCE,
  CEFR_ORDER,
  type DerivedCefrLevel,
} from "@/study/validation/cefr-mapping";

describe("cefr-mapping (P0-3) honesty contract", () => {
  it("every derived level is explicitly an internal estimate, never official", () => {
    const d = internalCefrFromScore(70);
    expect(d.internalEstimate).toBe(true);
    expect(d.caveatZh).toContain("非官方 CEFR 认证");
    expect(INTERNAL_ESTIMATE_NOTE).toContain("内部估算");
  });

  it("internalCefrOf stamps source + confidence + evidence from an AbilityEstimate", () => {
    const d = internalCefrOf(
      { level: "B2", rating: 1400, score: 58, confidence: 0.6, trials: 8, correct: 6 },
      "algorithm",
    );
    expect(d.level).toBe("B2");
    expect(d.source).toBe("algorithm");
    expect(d.evidenceCount).toBe(8);
    expect(d.confidence).toBeGreaterThan(0.3);
    expect(d.confidence).toBeLessThanOrEqual(0.95);
  });

  it("score maps into monotonic bands", () => {
    expect(CEFR_ORDER[internalCefrFromScore(0).level]).toBeLessThanOrEqual(CEFR_ORDER[internalCefrFromScore(50).level]);
    expect(CEFR_ORDER[internalCefrFromScore(50).level]).toBeLessThanOrEqual(CEFR_ORDER[internalCefrFromScore(95).level]);
  });

  it("self-report source carries the weakest, most honest confidence", () => {
    const d = internalCefrOf({ level: "C1", rating: 1600, score: 75, confidence: 0.5, trials: 3, correct: 2 }, "self-report");
    expect(SOURCE_CONFIDENCE["self-report"]).toBeLessThan(SOURCE_CONFIDENCE["objective-test"]);
    expect(d.caveatZh).toContain("自评");
  });

  it("mergeCefrSources weights the strongest objective source most heavily", () => {
    const weak: DerivedCefrLevel = {
      level: "C1", confidence: 0.3, source: "self-report", evidenceCount: 1,
      caveatZh: "", internalEstimate: true,
    };
    const strong: DerivedCefrLevel = {
      level: "B2", confidence: 0.9, source: "objective-test", evidenceCount: 20,
      caveatZh: "", internalEstimate: true,
    };
    const merged = mergeCefrSources([weak, strong]);
    expect(merged.level).toBe("B2"); // objective evidence dominates
    expect(merged.source).toBe("objective-test");
    expect(merged.evidenceCount).toBe(21);
  });

  it("empty merge degrades to a low-confidence self-report A1 (no fabrication)", () => {
    const d = mergeCefrSources([]);
    expect(d.level).toBe("A1");
    expect(d.confidence).toBeLessThanOrEqual(0.1);
    expect(d.source).toBe("self-report");
  });
});
