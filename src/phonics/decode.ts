/**
 * decode() - grapheme-phoneme breakdown for teaching display.
 *
 * Honest by design: letters with no matching rule surface in `uncovered`
 * instead of being silently guessed. Word overrides handle irregular
 * high-frequency words (see PHONICS_OVERRIDES).
 */
import { PHONICS_OVERRIDES, PHONICS_RULES } from "@/phonics/rules";
import type { DecodeResult, DecodedSegment } from "@/phonics/types";

/** Grapheme candidates sorted longest-first for greedy matching. */
const GRAPHEME_INDEX: Array<{ grapheme: string; ruleId: string; phoneme: string }> = (() => {
  const list: Array<{ grapheme: string; ruleId: string; phoneme: string }> = [];
  for (const rule of PHONICS_RULES) {
    for (const grapheme of rule.graphemes) {
      list.push({ grapheme, ruleId: rule.id, phoneme: rule.phoneme });
    }
  }
  return list.sort((a, b) => b.grapheme.length - a.grapheme.length);
})();

export function decode(wordInput: string): DecodeResult {
  const word = wordInput.toLowerCase();
  const override = PHONICS_OVERRIDES[word];
  if (override) {
    const segments: DecodedSegment[] = override.map(([grapheme, phoneme]) => ({
      grapheme,
      phoneme: phoneme === "" ? "" : phoneme,
      ruleId: null,
    }));
    return finalize(word, segments);
  }

  const segments: DecodedSegment[] = [];
  let index = 0;
  while (index < word.length) {
    const rest = word.slice(index);
    const match = GRAPHEME_INDEX.find((candidate) => rest.startsWith(candidate.grapheme));
    if (match) {
      segments.push({ grapheme: match.grapheme, phoneme: match.phoneme, ruleId: match.ruleId });
      index += match.grapheme.length;
    } else {
      segments.push({ grapheme: word[index] as string, phoneme: null, ruleId: null });
      index += 1;
    }
  }
  return finalize(word, segments);
}

function finalize(word: string, segments: DecodedSegment[]): DecodeResult {
  // Merge trailing silent markers ("" phonemes keep the grapheme visible).
  const uncovered = segments.filter((s) => s.phoneme === null).map((s) => s.grapheme);
  const coveredLength = segments.reduce(
    (sum, s) => sum + (s.phoneme === null ? 0 : s.grapheme.length),
    0,
  );
  return {
    word,
    segments,
    uncovered,
    coverage: word.length === 0 ? 0 : Math.min(1, coveredLength / word.length),
  };
}

/** Human-readable Chinese line for cards, e.g. "sh /ʃ/ + i /ɪ/ + p /p/". */
export function explainWordZh(word: string): string {
  const result = decode(word);
  const parts = result.segments
    .filter((segment) => segment.phoneme !== null && segment.phoneme !== "")
    .map((segment) => `${segment.grapheme} ${segment.phoneme}`);
  const silent = result.segments
    .filter((segment) => segment.phoneme === "" || segment.phoneme === null)
    .map((segment) => segment.grapheme);
  let line = parts.join(" + ");
  if (silent.length > 0) {
    line += `（不发音/无规则：${silent.join(", ")}）`;
  }
  return line;
}
