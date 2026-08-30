/**
 * Day 8-30 course factory - compresses authoring boilerplate so each day is
 * pure teaching content. Vocab references the Phase 2 lexical model by id;
 * grammar references the Grammar Engine topics; reading/writing are authored.
 */
import type { DayContent } from "@/content/types";

export interface DaySpec {
  day: number;
  titleEn: string;
  titleZh: string;
  goalZh: string;
  vocabIds: string[];
  grammarTopicId: string;
  phonicsRuleIds: string[];
  phonicsPairId?: string;
  pattern: {
    titleZh: string;
    explainZh: string;
    examples: Array<[string, string]>;
    sentences: Array<[string, string]>;
  };
  reading: Array<[string, string]>;
  writing: { zh: string; hintEn: string };
}

export function buildDay(spec: DaySpec): DayContent {
  return {
    day: spec.day,
    titleEn: spec.titleEn,
    titleZh: spec.titleZh,
    goalZh: spec.goalZh,
    vocab: [],
    vocabIds: spec.vocabIds,
    pattern: {
      id: `p:d${spec.day}`,
      titleZh: spec.pattern.titleZh,
      explainZh: spec.pattern.explainZh,
      examples: spec.pattern.examples.map(([en, zh]) => ({ en, zh })),
      practiceSentences: spec.pattern.sentences.map(([en, zh]) => ({ en, zh })),
    },
    phonicsNoteZh: "",
    grammarTopicId: spec.grammarTopicId,
    phonicsFocus: {
      ruleIds: spec.phonicsRuleIds,
      pairIds: spec.phonicsPairId ? [spec.phonicsPairId] : [],
    },
    reading: spec.reading.map(([en, zh]) => ({ en, zh })),
    writingPrompt: spec.writing,
  };
}
