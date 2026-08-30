/**
 * Learning Validation Mode (Phase 20 P1).
 *
 * A self-check that samples the lexical items the learner has already engaged
 * with, presents a short recognition + gap-fill validation round, and records
 * a per-learner RETENTION BASELINE. Re-running later measures the retention
 * DELTA against that baseline, so the learner (and the app) can see whether
 * long-term retention is holding or slipping.
 *
 * Design constraints honoured here:
 *  - PURE logic lives in this module (seeded, deterministic -> unit testable).
 *  - No schema change: baselines persist via the existing `settings` key-value
 *    table (SCHEMA_VERSION stays frozen at 7).
 *  - AI is OPTIONAL and always degrades honestly. With no configured provider
 *    the gap-fill step degrades to a self-checked recognition prompt.
 */
import { allLexical } from "@/content/vocab";
import { db } from "@/data/db";
import { MASTERY_STAGES, type MasteryStage } from "@/core/types";

/** One validation prompt built from a lexical entry. */
export interface ValidationItem {
  id: string;
  word: string;
  zh: string;
  ipa: string;
  /** 4 recognition options (3 distractors + the correct zh). */
  options: string[];
  /** English sentence with the target word replaced by ______. */
  gapEn: string;
  gapKey: string;
}

export interface ValidationResult {
  itemId: string;
  mode: "recognition" | "gapfill";
  correct: boolean;
  answer: string;
}

/** Retention baseline / latest snapshot, stored per learner. */
export interface RetentionSnapshot {
  /** "lv-baseline" (first ever) or "lv-latest" (most recent round). */
  kind: "lv-baseline" | "lv-latest";
  timestamp: number;
  total: number;
  correct: number;
  /** Overall correct rate 0..100. */
  recallPct: number;
  /** Recognition-mode accuracy 0..100. */
  recognitionAcc: number;
  /** Gap-fill-mode accuracy 0..100 (null if no gap-fill items answered). */
  gapFillAcc: number | null;
  itemIds: string[];
}

// Deterministic seeded PRNG (mulberry32) so sampling is stable under test.
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: readonly T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sampleKnownItems(
  knownIds: readonly string[],
  size: number,
  seed: number,
): ValidationItem[] {
  const rand = rng(seed);
  const wanted = Math.max(1, size);
  const pool = allLexical().filter((e) => knownIds.includes(e.id));
  const picked = shuffle(pool, rand).slice(0, wanted);
  return picked.map((e) => {
    const distractors = pickDistractors(e, pool);
    const options = shuffle([e.zh, ...distractors], rand);
    const gapEn = blankWord(e.example.en, e.word);
    return {
      id: e.id,
      word: e.word,
      zh: e.zh,
      ipa: e.ipa,
      options,
      gapEn,
      gapKey: e.word.toLowerCase(),
    };
  });
}

function pickDistractors(entry: { zh: string; frequencyBand: number }, pool: readonly { zh: string; frequencyBand: number }[]): string[] {
  const others = pool.filter((o) => o.zh !== entry.zh);
  // Prefer distractors from the same frequency band (plausible confusions).
  const sameBand = others.filter((o) => o.frequencyBand === entry.frequencyBand);
  const source = sameBand.length >= 3 ? sameBand : others;
  const rand = rng(entry.frequencyBand * 7919 + source.length);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const o of shuffle(source, rand)) {
    if (out.length >= 3) break;
    if (!seen.has(o.zh)) {
      seen.add(o.zh);
      out.push(o.zh);
    }
  }
  return out;
}

export function blankWord(sentenceEn: string, word: string): string {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${esc}\\b`, "gi");
  const blanked = sentenceEn.replace(re, "______");
  return blanked === sentenceEn ? `${sentenceEn} (______ = ${word} 的句式练习)` : blanked;
}

export function computeBaseline(results: readonly ValidationResult[]): RetentionSnapshot {
  const total = results.length;
  const correct = results.filter((r) => r.correct).length;
  const recog = results.filter((r) => r.mode === "recognition" && r.correct).length;
  const recogTotal = results.filter((r) => r.mode === "recognition").length;
  const gap = results.filter((r) => r.mode === "gapfill" && r.correct).length;
  const gapTotal = results.filter((r) => r.mode === "gapfill").length;
  const pct = total === 0 ? 0 : Math.round((correct / total) * 1000) / 10;
  const rAcc = recogTotal === 0 ? 0 : Math.round((recog / recogTotal) * 1000) / 10;
  const gAcc = gapTotal === 0 ? null : Math.round((gap / gapTotal) * 1000) / 10;
  return {
    kind: "lv-latest",
    timestamp: Date.now(),
    total,
    correct,
    recallPct: pct,
    recognitionAcc: rAcc,
    gapFillAcc: gAcc,
    itemIds: results.map((r) => r.itemId),
  };
}

/** Signed retention delta in percentage points (latest - baseline). Null if no baseline. */
export function deltaPct(latest: RetentionSnapshot, baseline: RetentionSnapshot | null): number | null {
  if (!baseline) return null;
  return Math.round((latest.recallPct - baseline.recallPct) * 10) / 10;
}

/**
 * The set of lexical entries the learner has engaged with (memory stage at or
 * above "recognized"). Falls back to the most common words when the learner
 * has not yet engaged any vocabulary, so the mode is never empty.
 */
export async function loadKnownLexicalIds(): Promise<string[]> {
  const all = allLexical();
  const allIds = new Set(all.map((e) => e.id));
  const engaged = new Set<string>();
  const rows = await db.memoryStates.toArray().catch(() => []);
  const recognizedRank = MASTERY_STAGES.indexOf("recognized");
  for (const row of rows) {
    if (!allIds.has(row.itemId)) continue;
    const rank = MASTERY_STAGES.indexOf(row.stage as MasteryStage);
    if (rank >= recognizedRank) engaged.add(row.itemId);
  }
  if (engaged.size > 0) {
    return all.map((e) => e.id).filter((id) => engaged.has(id));
  }
  // Fallback: the most frequent words, deterministically ordered.
  return all
    .slice()
    .sort((a, b) => a.frequencyBand - b.frequencyBand || a.id.localeCompare(b.id))
    .slice(0, 40)
    .map((e) => e.id);
}

// ---------------------------------------------------------------------------
// Persistence — via the settings key-value table (IndexedDB), NOT a schema
// bump. SCHEMA_VERSION stays frozen at 7; baselines ride along with the
// learner's normal data export/import under a dedicated settings key.
// ---------------------------------------------------------------------------

export const BASELINE_SETTINGS_KEY = "lv-baseline";
export const LATEST_SETTINGS_KEY = "lv-latest";

export interface RetentionCache {
  baseline: RetentionSnapshot | null;
  latest: RetentionSnapshot | null;
}

export async function loadRetentionSettings(): Promise<RetentionCache> {
  const baselineRow = await db.settings.get(BASELINE_SETTINGS_KEY).catch(() => undefined);
  const latestRow = await db.settings.get(LATEST_SETTINGS_KEY).catch(() => undefined);
  return {
    baseline: (baselineRow?.value as RetentionSnapshot | undefined) ?? null,
    latest: (latestRow?.value as RetentionSnapshot | undefined) ?? null,
  };
}

export async function persistRetentionSettings(cache: RetentionCache): Promise<void> {
  if (cache.baseline) {
    await db.settings.put({ key: BASELINE_SETTINGS_KEY, value: cache.baseline });
  }
  if (cache.latest) {
    await db.settings.put({ key: LATEST_SETTINGS_KEY, value: cache.latest });
  }
}
