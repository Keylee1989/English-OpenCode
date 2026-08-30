/**
 * Grammar Engine v0 - generates the five required exercise kinds per topic:
 * 改错(correct) · 填空(fill) · 中译英(translate) · 排序(order) · 造句(produce).
 *
 * Deterministic per (topicId, salt) so days can revisit topics with fresh
 * variants while tests stay stable.
 */
import { seededShuffle } from "@/core/rng";
import { findLexical } from "@/content/vocab";
import { GRAMMAR_TOPICS, getGrammarTopic, type GrammarTopic } from "@/engines/grammar/topics";
import type { Exercise } from "@/study/exercise-types";

export { GRAMMAR_TOPICS, getGrammarTopic };
export type { GrammarTopic };

function escapeRegex(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Expand common contractions so translation accepts both forms. */
export function expandContractions(sentence: string): string[] {
  const out = [sentence];
  const map: Array<[RegExp, string]> = [
    [/n't\b/g, " not"],
    [/'re\b/g, " are"],
    [/'m\b/g, " am"],
    [/'ll\b/g, " will"],
  ];
  for (const [pattern, replacement] of map) {
    if (pattern.test(sentence)) out.push(sentence.replace(pattern, replacement));
  }
  return [...new Set(out)];
}

interface FillSource {
  example: { en: string; zh: string };
  template: string;
  answer: string;
}

function findFillSource(topic: GrammarTopic, salt: number): FillSource | null {
  for (let k = 0; k < topic.examples.length; k++) {
    const example = topic.examples[(k + salt) % topic.examples.length];
    for (const vocabId of topic.relatedVocabIds) {
      const entry = findLexical(vocabId);
      if (!entry || entry.word.length < 2) continue;
      const pattern = new RegExp(`\\b${escapeRegex(entry.word)}\\w*\\b`, "i");
      const match = example.en.match(pattern);
      if (match) {
        return {
          example,
          template: example.en.replace(match[0], "___"),
          answer: match[0],
        };
      }
    }
  }
  return null;
}

/**
 * Build a mixed practice set for one grammar topic.
 * Always covers all five kinds when content allows.
 */
export function generateGrammarExercises(
  topicId: string,
  salt = 0,
): Exercise[] {
  const topic = getGrammarTopic(topicId);
  if (!topic) return [];
  const exercises: Exercise[] = [];

  // 1) 改错 - pick the correct rewrite of a typical Chinese-learner mistake.
  const err = topic.commonErrors[salt % topic.commonErrors.length];
  const options = seededShuffle(
    [err.right, ...err.distractors],
    `${topic.id}-gc-${salt}`,
  );
  exercises.push({
    id: `gr-${topic.id}-gc-${salt}`,
    type: "grammar-correct",
    skill: "grammar",
    grammarTopicId: topic.id,
    promptEn: err.wrong,
    optionsEn: options,
    answerIndex: options.indexOf(err.right),
    explainZh: err.zh,
  });

  // 2) 填空 - blank a related vocabulary word inside a taught example.
  const fill = findFillSource(topic, salt);
  if (fill) {
    exercises.push({
      id: `gr-${topic.id}-fill-${salt}`,
      type: "fill-blank",
      skill: "grammar",
      grammarTopicId: topic.id,
      template: fill.template,
      answer: fill.answer,
      zh: fill.example.zh,
      explainZh: `完整句子：${fill.example.en}（${fill.example.zh}）`,
    });
  }

  // 3) 排序 - rebuild a taught example sentence.
  const orderExample = topic.examples[(salt + 1) % topic.examples.length];
  let tokens = seededShuffle(orderExample.en.split(" "), `${topic.id}-ord-${salt}`);
  if (tokens.join(" ") === orderExample.en) {
    tokens = seededShuffle(tokens, `${topic.id}-ord-${salt}-alt`);
  }
  exercises.push({
    id: `gr-${topic.id}-ord-${salt}`,
    type: "sentence-order",
    skill: "grammar",
    grammarTopicId: topic.id,
    tokens,
    answer: orderExample.en,
    zh: orderExample.zh,
  });

  // 4) 中译英 - active production from the Chinese prompt.
  const translate = topic.examples[salt % topic.examples.length];
  exercises.push({
    id: `gr-${topic.id}-tr-${salt}`,
    type: "translate-zh-en",
    skill: "writing",
    grammarTopicId: topic.id,
    promptZh: translate.zh,
    acceptedAnswers: expandContractions(translate.en),
    modelAnswer: translate.en,
    hintEn: `提示句型：${topic.rule}`,
  });

  // 5) 造句 - guided free production with model-answer self-check.
  const requiredWords = topic.relatedVocabIds
    .map((id) => findLexical(id)?.word)
    .filter((word): word is string => Boolean(word))
    .slice(0, 2);
  exercises.push({
    id: `gr-${topic.id}-prod-${salt}`,
    type: "guided-production",
    skill: "writing",
    grammarTopicId: topic.id,
    cueZh: `用「${topic.nameZh}」写一句你自己的话（可用词：${requiredWords.join("、") || "任意"}）。`,
    requiredWords,
    modelAnswer: topic.examples[0].en,
  });

  return exercises;
}

export function grammarTopicCount(): number {
  return GRAMMAR_TOPICS.length;
}
