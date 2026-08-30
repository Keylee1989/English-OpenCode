import type { VocabRow } from "@/content/vocab/types";

/** Compact authoring helper - one line per word. */
export function v(
  word: string,
  zh: string,
  ipa: string,
  pos: string,
  band: number,
  diff: number,
  exEn: string,
  exZh: string,
  col: string,
  extra?: VocabRow["extra"],
): VocabRow {
  return { word, zh, ipa, pos, band, diff, exEn, exZh, col, extra };
}
