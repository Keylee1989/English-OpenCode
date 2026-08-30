/**
 * Adaptive session orchestrator for the baseline system.
 *
 * For each skill we run a short, deterministic BAND SWEEP: we present probes
 * that traverse the CEFR difficulty range (starting near the B1 prior and
 * expanding around it), record correct/incorrect per trial, and fold them into
 * the Elo estimator. This surfaces the learner's ability boundary without a
 * giant exam, and is fully deterministic/testable (seeded).
 */
import { estimateFromTrials, type AbilityEstimate, type CefrLevel, type Trial } from "./adaptive";
import type { ProbeAnswer, Probe } from "./banks/types";
import type { SkillKey } from "@/core/types";

export type BankSource = (band: CefrLevel, seed: number) => Probe[];

export const BAND_ORDER: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

/**
 * Deterministic band sweep of `count` targets, centred loosely on B1 and
 * spreading outward, so the round is neither trivially easy nor impossibly hard.
 */
export function bandSweep(count: number, seed: number): CefrLevel[] {
  const rand = seedOf(seed);
  const center = 2; // B1 index
  const out: CefrLevel[] = [];
  let step = 0;
  let direction = 1;
  while (out.length < count) {
    const offset = step === 0 ? 0 : (Math.floor((step + 1) / 2)) * direction;
    let idx = center + offset;
    if (idx < 0 || idx >= BAND_ORDER.length) idx = Math.min(BAND_ORDER.length - 1, Math.max(0, idx));
    out.push(BAND_ORDER[idx]);
    step++;
    if (step % 2 === 1) direction = -direction;
    // Introduce mild stochasticity to avoid a rigid zig-zag while staying seeded.
    if (rand() < 0.3) {
      const bump = rand() < 0.5 ? -1 : 1;
      const alt = Math.min(BAND_ORDER.length - 1, Math.max(0, idx + bump));
      if (out[out.length - 1] !== BAND_ORDER[alt]) out[out.length - 1] = BAND_ORDER[alt];
    }
  }
  return out;
}

function seedOf(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SkillPlan {
  skill: SkillKey;
  probes: Probe[];
}

/**
 * Build the probe plan for one skill. The band sweep determines how many
 * probes per band; the bank must supply unique probes per band (the caller
 * passes a bank that supports repeated calls with different seeds per band).
 */
export function planSkill(
  skill: SkillKey,
  bank: BankSource,
  perSkill: number,
  seed: number,
  usedIds: Set<string> = new Set(),
): SkillPlan {
  const targetBands = bandSweep(perSkill, seed);
  // Ensure each band is sampled distinctly by drawing with a fresh sub-seed.
  const probes: Probe[] = [];
  const bandCount = new Map<CefrLevel, number>();
  for (const band of targetBands) {
    bandCount.set(band, (bandCount.get(band) ?? 0) + 1);
  }
  for (const band of BAND_ORDER) {
    const need = bandCount.get(band) ?? 0;
    if (need === 0) continue;
    // Draw candidates; skip ids already used elsewhere in this session.
    let candidates = bank(band, seed * 1000 + BAND_ORDER.indexOf(band)).filter(
      (p) => !usedIds.has(p.id),
    );
    let extra = 0;
    while (candidates.length < need && extra < 200) {
      candidates = bank(band, seed * 1000 + BAND_ORDER.indexOf(band) * 1000 + extra);
      extra++;
    }
    for (const p of candidates.slice(0, need)) {
      probes.push(p);
      usedIds.add(p.id);
    }
  }
  // Keep a stable order aligned with the sweep (grouped by first occurrence).
  const byIndex = new Map(probes.map((p, i) => [p.id, i]));
  probes.sort(
    (a, b) =>
      targetBands.indexOf(a.band) - targetBands.indexOf(b.band) || (byIndex.get(a.id) ?? 0) - (byIndex.get(b.id) ?? 0),
  );
  // Deterministic shuffle to avoid band-grouped monotony.
  return { skill, probes: shuffle(probes, seedOf(seed * 31 + 7)) };
}

function shuffle<T>(arr: readonly T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Grade an answere to a probe.
 *  - Choice kinds: exact match on selection.
 *  - recall/dictation/correction: case-insensitive, trimmed, whitespace
 *    normalised match on the `key`.
 *  - speaking/writing: NOT auto-graded; returns correct=null (caller must
 *    self-report or use AI).
 */
export function gradeProbeAnswer(probe: Probe, answerText: string): ProbeAnswer | null {
  const raw = (answerText ?? "").trim();
  if (probe.kind === "vocab-recognition" || probe.kind === "vocab-collocation") {
    if (!probe.key) return null;
    return { correct: raw === probe.key, answerText: raw };
  }
  if (probe.kind === "reading-choice" || probe.kind === "grammar-choice") {
    if (!probe.key) return null;
    return { correct: raw === probe.key, answerText: raw };
  }
  if (probe.kind === "vocab-recall" || probe.kind === "listening-dictation" || probe.kind === "grammar-correction") {
    if (!probe.key) return null;
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
    return { correct: norm(raw) === norm(probe.key), answerText: raw };
  }
  return null;
}

export interface SkillRoundResult {
  skill: SkillKey;
  probes: Probe[];
  trials: Trial[];
  estimate: AbilityEstimate;
}

/** Convert a plan's answers into an estimate. */
export function estimateFromSkillAnswers(
  skill: SkillKey,
  probes: Probe[],
  answers: Record<number, ProbeAnswer | null>,
): SkillRoundResult {
  const trials: Trial[] = [];
  for (let i = 0; i < probes.length; i++) {
    const a = answers[i];
    if (a && typeof a.correct === "boolean") {
      trials.push({ level: probes[i].band, correct: a.correct, productive: probes[i].productive });
    }
  }
  const estimate = estimateFromTrials(trials);
  return { skill, probes, trials, estimate };
}
