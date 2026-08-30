import type { VocabRow } from "@/content/vocab/types";

/**
 * Phase 15-A: C1/C2 vocabulary row (extended authoring schema).
 *
 * Extends the compact VocabRow philosophy with CEFR-level fields that matter
 * at advanced levels: polysemy nuance, register, channel of use, and
 * synonym/antonym WORDS (display-only strings - they are NOT wired into the
 * relation graph, so no dangling-reference risk; relation wiring stays a
 * deliberate editorial act on existing rows).
 */
export type CefrLevel = "C1" | "C2";
export type Register = "formal" | "neutral" | "casual" | "academic" | "slang" | "business";
export type Usage = "spoken" | "written" | "both";

export interface C2VocabRow {
  /** Stable id token, e.g. "nuanced" -> lexical id "w:nuanced". */
  word: string;
  ipa: string;
  pos: string;
  zh: string;
  level: CefrLevel;
  register: Register;
  usage: Usage;
  /** Chinese note on nuance / polysemy / register contrast. */
  meaningNuance: string;
  exampleEN: string;
  exampleZH: string;
  collocation: string;
  synonyms: string[];
  antonyms: string[];
  /** Phase 16-A: typical learner mistake with correction, e.g. "affect→effect". */
  commonMistakes?: string;
  /** Phase 16-A: topic tag for library filtering, e.g. "academic-argument". */
  topic?: string;
}

/** Compile-time helper mirroring v() for C2 rows - one line per word. */
export function cv(
  word: string,
  ipa: string,
  pos: string,
  zh: string,
  level: CefrLevel,
  register: Register,
  usage: Usage,
  meaningNuance: string,
  exampleEN: string,
  exampleZH: string,
  collocation: string,
  synonyms: string[],
  antonyms: string[],
  extra?: { commonMistakes?: string; topic?: string },
): C2VocabRow {
  return {
    word,
    ipa,
    pos,
    zh,
    level,
    register,
    usage,
    meaningNuance,
    exampleEN,
    exampleZH,
    collocation,
    synonyms,
    antonyms,
    ...(extra?.commonMistakes ? { commonMistakes: extra.commonMistakes } : {}),
    ...(extra?.topic ? { topic: extra.topic } : {}),
  };
}

/** A merged lexical entry carrying the optional C2 display layer. */
export type C2LexicalEntryExtras = Pick<
  C2VocabRow,
  "level" | "register" | "usage" | "meaningNuance"
>;

export const C2_REGISTER_ZH: Record<Register, string> = {
  formal: "正式",
  neutral: "中性",
  casual: "口语",
  academic: "学术",
  slang: "俚语",
  business: "商务",
};

export function toVocabRow(row: C2VocabRow): VocabRow {
  // Map into the runtime model: band/difficulty derived from level/register
  // so planner/SRS treat C-level words with appropriate weight.
  const band = row.level === "C2" ? 7 : 6;
  const difficulty =
    Math.min(
      0.85,
      (row.level === "C2" ? 0.62 : 0.5) +
        (row.register === "academic" || row.register === "formal" ? 0.06 : 0) +
        (row.register === "slang" ? 0.04 : 0),
    );
  return {
    word: row.word,
    zh: `${row.zh}（${C2_REGISTER_ZH[row.register]}·${row.usage}）`,
    ipa: row.ipa,
    pos: row.pos,
    band,
    diff: Number(difficulty.toFixed(2)),
    exEn: row.exampleEN,
    exZh: row.exampleZH,
    // Empty collocation falls back to the headword so every merged entry
    // satisfies the runtime contract (>=1 non-empty collocation).
    col: row.collocation || row.word,
  };
}
