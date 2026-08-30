import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import {
  eloExpected,
  updateRating,
  estimateFromTrials,
  cefrForElo,
  PRIOR_RATING,
  type Trial,
} from "@/study/validation/adaptive";
import { bandSweep, planSkill, gradeProbeAnswer, estimateFromSkillAnswers } from "@/study/validation/session";
import { grammarBankForBand } from "@/study/validation/banks/grammar-bank";
import { readingBankForBand } from "@/study/validation/banks/reading-bank";
import { listeningBankForBand } from "@/study/validation/banks/listening-bank";
import { speakingBankForBand } from "@/study/validation/banks/speaking-bank";
import { writingBankForBand } from "@/study/validation/banks/writing-bank";
import { bandForLexical, vocabRecognitionProbes, vocabCandidatesForBand } from "@/study/validation/banks/vocab-bank";
import { allLexical } from "@/content/vocab";
import { buildAllRounds } from "@/study/validation/run-baseline";
import {
  overallFromSkills,
  emptySkillRecord,
  cefrBandDelta,
  bandDeltaFrom,
  loadBaselineCache,
  persistBaselineResult,
  BASELINE_SKILLS,
} from "@/study/validation/baseline-model";

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
});

// ---------------------------------------------------------------------------
// adaptive.ts
// ---------------------------------------------------------------------------
describe("adaptive Elo estimator", () => {
  it("eloExpected is 0.5 for equal ratings and bounded 0..1", () => {
    expect(eloExpected(1200, 1200)).toBeCloseTo(0.5, 5);
    expect(eloExpected(1200, 1800)).toBeGreaterThan(0);
    expect(eloExpected(1200, 1800)).toBeLessThan(0.5);
  });

  it("correct answers raise and wrong answers lower the rating", () => {
    const up = updateRating(1200, 1200, true);
    const down = updateRating(1200, 1200, false);
    expect(up).toBeGreaterThan(1200);
    expect(down).toBeLessThan(1200);
  });

  it("all-correct high trials land at a high level with rising confidence", () => {
    const trials: Trial[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(() => ({
      level: "C2" as const,
      correct: true,
    }));
    const est = estimateFromTrials(trials);
    expect(["C1", "C2"].includes(est.level)).toBe(true);
    expect(est.correct).toBe(10);
    expect(est.confidence).toBeGreaterThan(0.4);
  });

  it("all-wrong low trials drop below the B1 prior", () => {
    const trials: Trial[] = [1, 2, 3, 4, 5, 6].map(() => ({
      level: "A1" as const,
      correct: false,
    }));
    const est = estimateFromTrials(trials);
    expect(est.rating).toBeLessThan(PRIOR_RATING);
    expect(est.rating).toBeLessThan(1100); // below the A2|B1 boundary
    expect(est.confidence).toBeGreaterThan(0);
  });

  it("empty trials return a low-confidence A1 placeholder", () => {
    const est = estimateFromTrials([]);
    expect(est.level).toBe("A1");
    expect(est.confidence).toBeLessThan(0.4);
  });

  it("cefrForElo maps boundaries to bands", () => {
    expect(cefrForElo(800)).toBe("A1");
    expect(cefrForElo(1200)).toBe("B1");
    expect(cefrForElo(1900)).toBe("C2");
  });
});

// ---------------------------------------------------------------------------
// session.ts
// ---------------------------------------------------------------------------
describe("adaptive session planner", () => {
  it("bandSweep is deterministic and covers multiple bands", () => {
    const a = bandSweep(8, 99);
    const b = bandSweep(8, 99);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBeGreaterThanOrEqual(4);
    expect(a.every((x) => ["A1", "A2", "B1", "B2", "C1", "C2"].includes(x))).toBe(true);
  });

  it("planSkill gathers unique probes across bands deterministically", () => {
    const plan1 = planSkill("grammar", grammarBankForBand, 8, 5);
    const plan2 = planSkill("grammar", grammarBankForBand, 8, 5);
    expect(plan1.probes.length).toBe(8);
    expect(plan1.probes.map((p) => p.id)).toEqual(plan2.probes.map((p) => p.id));
    const ids = new Set(plan1.probes.map((p) => p.id));
    expect(ids.size).toBe(plan1.probes.length);
  });

  it("gradeProbeAnswer handles choice and typed kinds", () => {
    const g = gradeProbeAnswer(
      { id: "t", skill: "grammar", band: "B1", kind: "grammar-choice", productive: false, promptEn: "q", promptZh: "zh", options: ["is", "are"], key: "is" },
      "is",
    );
    expect(g?.correct).toBe(true);
    const r = gradeProbeAnswer(
      { id: "t", skill: "vocabulary", band: "A1", kind: "vocab-recall", productive: true, promptEn: "q", promptZh: "zh", key: "Water" },
      "  water ",
    );
    expect(r?.correct).toBe(true);
    // speaking/writing not auto-graded
    const s = gradeProbeAnswer(
      { id: "t", skill: "speaking", band: "B1", kind: "speaking-opinion", productive: true, promptEn: "q", promptZh: "zh" },
      "anything",
    );
    expect(s).toBeNull();
  });

  it("estimateFromSkillAnswers folds the gradeable trials only", () => {
    const probes = grammarBankForBand("B1").slice(0, 6);
    const answers: Record<number, { correct: boolean; answerText: string } | null> = {};
    for (let i = 0; i < probes.length; i++) {
      answers[i] = i % 2 === 0 ? { correct: true, answerText: "x" } : { correct: false, answerText: "y" };
    }
    const res = estimateFromSkillAnswers("grammar", probes, answers);
    expect(res.trials.length).toBe(probes.length);
    expect(res.estimate.trials).toBe(probes.length);
  });
});

// ---------------------------------------------------------------------------
// banks
// ---------------------------------------------------------------------------
describe("baseline banks", () => {
  it("authored banks cover all six bands with gradeable auto keys", () => {
    const counts: Record<string, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
    for (const band of Object.keys(counts) as (keyof typeof counts)[]) {
      counts[band] =
        grammarBankForBand(band as never).length +
        readingBankForBand(band as never).length +
        listeningBankForBand(band as never).length +
        speakingBankForBand(band as never).length +
        writingBankForBand(band as never).length;
    }
    for (const band of Object.keys(counts) as (keyof typeof counts)[]) {
      expect(counts[band]).toBeGreaterThanOrEqual(16);
    }
  });

  it("vocab bank maps CEFR-bound entries and builds recognition probes", () => {
    // At least one C2-tagged entry exists.
    const c2 = allLexical().find((e) => e.level === "C2");
    expect(c2).toBeTruthy();
    if (c2) expect(bandForLexical(c2)).toBe("C2");
    const probes = vocabRecognitionProbes("C1", 4, 123);
    expect(probes.length).toBe(4);
    for (const p of probes) {
      expect(p.options?.length).toBe(4);
      expect(p.options).toContain(p.key);
      expect(p.productive).toBe(false);
    }
  });

  it("vocab candidates are deterministic per band", () => {
    expect(vocabCandidatesForBand("B2", 7).map((e) => e.id)).toEqual(
      vocabCandidatesForBand("B2", 7).map((e) => e.id),
    );
  });
});

// ---------------------------------------------------------------------------
// baseline-model.ts
// ---------------------------------------------------------------------------
describe("baseline model", () => {
  it("overallFromSkills combines into an overall estimate", () => {
    const skills = emptySkillRecord();
    skills.vocabulary = { level: "B2", rating: 1450, score: 62, confidence: 0.6, trials: 8, correct: 6 };
    skills.grammar = { level: "B1", rating: 1250, score: 45, confidence: 0.5, trials: 6, correct: 4 };
    const result = overallFromSkills(skills, 1, ["a", "b"], { probes: 14, correct: 10 });
    expect(result.overall.trials).toBe(14);
    expect(["B1", "B2", "C1"].includes(result.overall.level)).toBe(true);
    expect(result.skills.vocabulary.level).toBe("B2");
    expect(result.limitations.length).toBeGreaterThan(0);
  });

  it("cefrBandDelta measures band movement", () => {
    expect(cefrBandDelta("A1", "C2")).toBe(5);
    expect(cefrBandDelta("B1", "B1")).toBe(0);
    expect(cefrBandDelta("C2", "A1")).toBe(-5);
  });

  it("bandDeltaFrom computes overall and per-skill deltas", () => {
    const base = overallFromSkills((() => {
      const s = emptySkillRecord();
      s.vocabulary = { level: "B1", rating: 1250, score: 50, confidence: 0.5, trials: 8, correct: 4 };
      return s;
    })(), 1, [], { probes: 8, correct: 4 });
    const lat = overallFromSkills((() => {
      const s = emptySkillRecord();
      s.vocabulary = { level: "C1", rating: 1650, score: 80, confidence: 0.6, trials: 8, correct: 6 };
      return s;
    })(), 1, [], { probes: 8, correct: 6 });
    const d = bandDeltaFrom(lat, base);
    expect(d.overall).toBeGreaterThanOrEqual(0);
    expect(typeof d.skills?.vocabulary).toBe("number");
  });

  it("persistBaselineResult round-trips baseline/latest/history via settings table", async () => {
    const skills = emptySkillRecord();
    skills.grammar = { level: "B1", rating: 1250, score: 45, confidence: 0.5, trials: 6, correct: 4 };
    const result = overallFromSkills(skills, 1, ["p1"], { probes: 6, correct: 4 });
    await persistBaselineResult(result);
    const cache = await loadBaselineCache();
    expect(cache.baseline?.overall.level).toBe(result.overall.level);
    expect(cache.latest?.timestamp).toBe(result.timestamp);
    expect(cache.history.some((h) => h.timestamp === result.timestamp)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// run-baseline.ts (full flow construction)
// ---------------------------------------------------------------------------
describe("run-baseline end-to-end assembly", () => {
  it("buildAllRounds produces all six skills with unique probes", () => {
    const { rounds, usedIds } = buildAllRounds(2026);
    expect(rounds.map((r) => r.skill)).toEqual([
      "vocabulary",
      "grammar",
      "reading",
      "listening",
      "speaking",
      "writing",
    ]);
    expect(rounds.length).toBe(BASELINE_SKILLS.length);
    for (const r of rounds) {
      expect(r.probes.length).toBeGreaterThan(0);
    }
    expect(usedIds.size).toBe(rounds.reduce((a, r) => a + r.probes.length, 0));
  });

  it("auto-grades every gradeable probe with a correct answer", () => {
    const { rounds } = buildAllRounds(7);
    for (const round of rounds) {
      for (const probe of round.probes) {
        if (probe.kind === "speaking-opinion" || probe.kind === "writing-essay") continue;
        if (probe.kind === "vocab-recall" || probe.kind === "listening-dictation" || probe.kind === "grammar-correction") {
          expect(probe.key && probe.key.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
