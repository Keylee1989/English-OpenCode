/**
 * Vocabulary probe bank for the adaptive baseline.
 *
 * Built programmatically from the real 13,000-entry lexical model (reuses the
 * authored content — no new words invented). Each entry is binned to a CEFR
 * band: explicit `level` when present (C2/C1 expansion rows), otherwise a
 * documented frequencyBand heuristic. Probes reuse real meaning, ipa, example
 * sentence, and collocations — never invented.
 */
import { allLexical } from "@/content/vocab";
import type { LexicalEntryV2 } from "@/content/vocab/types";
import type { Probe } from "./types";
import type { CefrLevel } from "@/study/validation/adaptive";
import { rng, shuffle } from "@/study/validation/lvm";

/**
 * Bin an entry to a band. Explicit `level` wins; otherwise map frequencyBand
 * (Zipf-style, 1 = most frequent) to a CEFR band as a documented heuristic.
 */
export function bandForLexical(e: Pick<LexicalEntryV2, "level" | "frequencyBand">): CefrLevel | null {
  if (e.level === "C1" || e.level === "C2") return e.level;
  if (e.level === "A1" || e.level === "A2" || e.level === "B1" || e.level === "B2") {
    return e.level;
  }
  const b = e.frequencyBand;
  if (b <= 2) return "A1";
  if (b === 3) return "A2";
  if (b === 4) return "B1";
  if (b === 5) return "B2";
  // band 6-7 (least frequent) are treated as high-level (C1/C2) territory.
  if (b === 6) return "C1";
  return "C2";
}

const ALL = allLexical();

/** Deterministic candidate pool for a band (seeded for stable sampling). */
export function vocabCandidatesForBand(band: CefrLevel, seed: number): LexicalEntryV2[] {
  const pool = ALL.filter((e) => bandForLexical(e) === band);
  return shuffle(pool, rng(seed));
}

export function hasValidExample(e: LexicalEntryV2): boolean {
  return typeof e.example?.en === "string" && e.example.en.trim().length > 4;
}

/**
 * Build a deterministic set of recognition probes (choose the Chinese meaning).
 * `n` probes, drawn from the band pool. Uses the example sentence for context.
 */
export function vocabRecognitionProbes(band: CefrLevel, n: number, seed: number): Probe[] {
  const pool = vocabCandidatesForBand(band, seed).filter(hasValidExample).slice(0, n * 12);
  const selected = pool.slice(0, n);
  return selected.map((e, i) => {
    const distractors = pickZhDistractors(e, pool);
    const options = shuffle([e.zh, ...distractors], rng(seed + i * 7 + 1)).slice(0, 4);
    return {
      id: `vocab-recognition-${band}-${i}`,
      skill: "vocabulary",
      band,
      kind: "vocab-recognition",
      productive: false,
      promptEn: `Choose the Chinese meaning of "${e.word}" /${e.ipa}/.\nContext: ${e.example.en}`,
      promptZh: `选出 「${e.word}」 的正确中文释义。句式：${e.example.zh}`,
      options,
      key: e.zh,
      refs: [e.id],
      tipZh: `${e.word} ${e.pos} → ${e.zh}`,
    } satisfies Probe;
  });
}

function pickZhDistractors(e: LexicalEntryV2, pool: LexicalEntryV2[]): string[] {
  const candidates = pool.filter((o) => o.id !== e.id && o.zh && o.zh !== e.zh);
  const seen = new Set<string>([e.zh]);
  const out: string[] = [];
  for (const o of candidates) {
    if (out.length >= 3) break;
    if (!seen.has(o.zh) && o.zh.length > 0) {
      seen.add(o.zh);
      out.push(o.zh);
    }
  }
  return shuffle(out, rng(e.word.length * 31 + pool.length)).slice(0, 3);
}

/** Productive recall probe: type the English word from its meaning + ipa. */
export function vocabRecallProbe(entry: LexicalEntryV2): Probe {
  return {
    id: `vocab-recall-${entry.id}`,
    skill: "vocabulary",
    band: bandForLexical(entry) ?? "A1",
    kind: "vocab-recall",
    productive: true,
    promptEn: `Type the English word for: ${entry.zh}  /${entry.ipa}/`,
    promptZh: `根据中文释义和音标，输入对应的英文单词：${entry.zh}`,
    key: entry.word.toLowerCase(),
    refs: [entry.id],
    tipZh: `${entry.word} — ${entry.zh}`,
  } satisfies Probe;
}

/** Collocation probe: pick the phrase that most naturally collocates. */
export function vocabCollocationProbe(entry: LexicalEntryV2, seed: number): Probe {
  const mine = entry.collocations ?? [];
  const fallback = `${entry.word} ${entry.pos}`.trim();
  const correct = mine.length > 0 ? mine[0] : fallback;
  const distractors = distractorCollocations(entry, seed);
  const options = shuffle([correct, ...distractors], rng(seed + entry.word.length)).slice(0, 4);
  return {
    id: `vocab-collocation-${entry.id}`,
    skill: "vocabulary",
    band: bandForLexical(entry) ?? "A1",
    kind: "vocab-collocation",
    productive: false,
    promptEn: `Which phrase most naturally collocates with "${entry.word}"?`,
    promptZh: `下列短语中，哪个与 「${entry.word}」 搭配最自然？`,
    options,
    key: correct,
    refs: [entry.id],
    tipZh: `${entry.word} 常用搭配：${mine.slice(0, 3).join("、") || "见例句"}`,
  } satisfies Probe;
}

function distractorCollocations(entry: LexicalEntryV2, seed: number): string[] {
  const others = ALL.filter((o) => o.id !== entry.id && (o.collocations?.length ?? 0) > 0);
  const picked = shuffle(others, rng(seed + 1337)).slice(0, 6);
  const out: string[] = [];
  for (const o of picked) {
    if (out.length >= 3) break;
    const phrase = o.collocations[0];
    if (phrase && !out.includes(phrase) && phrase !== (entry.collocations?.[0])) {
      out.push(phrase);
    }
  }
  return out;
}

export const VOCAB_BANK_COUNT = ALL.length;
