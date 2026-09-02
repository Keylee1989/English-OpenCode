/**
 * Deterministic exercise generation from authored day content.
 *
 * Determinism matters: the same exercise id always yields the same options /
 * token order, so tests are stable and review sessions are reproducible.
 * Audio-dependent exercises are only generated when TTS is actually available
 * (honest degradation - we never show a listening task that cannot play).
 */
import { allVocab, findVocab } from "@/content";
import type { VocabEntry } from "@/content/types";
import type { InteractionKind } from "@/core/types";
import { seededShuffle } from "@/core/rng";
import type {
  Exercise,
  ExerciseSkill,
} from "@/study/exercise-types";
import { isSpeechSupported } from "@/speech/tts";
import { DAYS } from "@/content/days";
import { generateGrammarExercises } from "@/engines/grammar/grammar-engine-v0";
import { buildPhonicsDrills } from "@/phonics/drills";

// ---------------------------------------------------------------------------
// Seeded RNG helpers (moved to core/rng; kept re-exported for compatibility)
// ---------------------------------------------------------------------------

export { seededShuffle };

// ---------------------------------------------------------------------------
// Interaction mapping (single source of truth used by the study runner)
// ---------------------------------------------------------------------------

export function interactionFor(type: Exercise["type"]): {
  interaction: InteractionKind;
  skill: ExerciseSkill;
} {
  switch (type) {
    case "mcq-meaning":
      return { interaction: "multiple-choice", skill: "vocabulary" };
    case "mcq-reverse":
      return { interaction: "multiple-choice", skill: "vocabulary" };
    case "mcq-listening-word":
      return { interaction: "listening", skill: "listening" };
    case "listen-judge":
      return { interaction: "listening", skill: "listening" };
    case "fill-blank":
      return { interaction: "fill-blank", skill: "grammar" };
    case "recall-type":
      return { interaction: "recall", skill: "vocabulary" };
    case "sentence-order":
      return { interaction: "sentence-ordering", skill: "grammar" };
    case "shadowing":
      return { interaction: "self-assess", skill: "speaking" };
    case "phonics-discriminate":
      return { interaction: "listening", skill: "listening" };
    case "grammar-correct":
      return { interaction: "multiple-choice", skill: "grammar" };
    case "translate-zh-en":
      return { interaction: "typing", skill: "writing" };
    case "guided-production":
      return { interaction: "free-response", skill: "writing" };
    case "reading-comprehension":
      return { interaction: "reading-comprehension", skill: "reading" };
  }
}

/** Production exercises require active language output, not recognition. */
const PRODUCTION_TYPES: ReadonlySet<Exercise["type"]> = new Set([
  "recall-type",
  "fill-blank",
  "sentence-order",
  "translate-zh-en",
  "guided-production",
]);

export function isProductionType(type: Exercise["type"]): boolean {
  return PRODUCTION_TYPES.has(type);
}

// ---------------------------------------------------------------------------
// Option/distractor helpers
// ---------------------------------------------------------------------------

function pickDistractors(
  pool: readonly VocabEntry[],
  excludeId: string,
  field: "zh" | "word",
  count: number,
  seedText: string,
): string[] {
  const values = pool
    .filter((entry) => entry.id !== excludeId)
    .map((entry) => entry[field]);
  const unique = [...new Set(values)];
  const shuffled = seededShuffle(unique, seedText);
  return shuffled.slice(0, count);
}

function buildMcq(
  id: string,
  target: VocabEntry,
  pool: readonly VocabEntry[],
  direction: "meaning" | "reverse",
): Exercise {
  const wrong = pickDistractors(pool, target.id, direction === "meaning" ? "zh" : "word", 3, `${id}-dist`);
  const correctValue = direction === "meaning" ? target.zh : target.word;
  const values = seededShuffle([correctValue, ...wrong], `${id}-order`);
  const answerIndex = values.indexOf(correctValue);
  const explainZh = `${target.word} ${target.ipa} — ${target.zh}`;
  if (direction === "meaning") {
    return {
      id,
      type: "mcq-meaning",
      skill: "vocabulary",
      itemId: target.id,
      wordEn: target.word,
      optionsZh: values,
      answerIndex,
      explainZh,
    };
  }
  return {
    id,
    type: "mcq-reverse",
    skill: "vocabulary",
    itemId: target.id,
    promptZh: target.zh,
    optionsEn: values,
    answerIndex,
    explainZh,
  };
}

function buildListenWord(id: string, target: VocabEntry, pool: readonly VocabEntry[]): Exercise {
  const wrong = pickDistractors(pool, target.id, "word", 3, `${id}-dist`);
  const values = seededShuffle([target.word, ...wrong], `${id}-order`);
  return {
    id,
    type: "mcq-listening-word",
    skill: "listening",
    requiresAudio: true,
    itemId: target.id,
    speakText: target.word,
    optionsEn: values,
    answerIndex: values.indexOf(target.word),
  };
}

function buildFillBlank(dayNumber: number, index: number): Exercise | null {
  const fills: Array<{ template: string; answer: string; zh: string }> = [
    { template: "I'm ___. (介绍自己叫林)", answer: "Lin", zh: "我是林。" },
    { template: "My name ___ Li Na.", answer: "is", zh: "我的名字叫李娜。" },
    { template: "___ old are you?", answer: "How", zh: "你多大了？" },
    { template: "This is my ___. (妈妈)", answer: "mom", zh: "这是我妈妈。" },
    { template: "She ___ my mom.", answer: "is", zh: "她是我妈妈。" },
    { template: "I want a ___, please. (咖啡)", answer: "coffee", zh: "我想要一杯咖啡。" },
    { template: "Nice to meet ___.", answer: "you", zh: "很高兴认识你。" },
    { template: "It ___ red.", answer: "is", zh: "它是红色的。" },
  ];
  const pick = fills[(dayNumber + index) % fills.length];
  if (!pick) return null;
  return {
    id: `d${dayNumber}-fill-${index}`,
    type: "fill-blank",
    skill: "grammar",
    template: pick.template,
    answer: pick.answer,
    zh: pick.zh,
    explainZh: `完整句子：${pick.template.replace("___", pick.answer)}（${pick.zh}）`,
  };
}

function buildSentenceOrder(dayContent: { day: number; pattern: { practiceSentences: Array<{ en: string; zh: string }> } }, index: number): Exercise | null {
  const sentence = dayContent.pattern.practiceSentences[index % dayContent.pattern.practiceSentences.length];
  if (!sentence || !sentence.en.includes(" ")) return null;
  const tokens = seededShuffle(sentence.en.split(" "), `d${dayContent.day}-order-${index}`);
  // Guard: shuffle must actually scramble (retry once with different salt).
  const scrambled = tokens.join(" ") === sentence.en
    ? seededShuffle(tokens, `d${dayContent.day}-order-${index}-alt`)
    : tokens;
  return {
    id: `d${dayContent.day}-ord-${index}`,
    type: "sentence-order",
    skill: "grammar",
    tokens: scrambled,
    answer: sentence.en,
    zh: sentence.zh,
  };
}

function buildListenJudge(dayNumber: number, sentences: Array<{ en: string; zh: string }>, index: number): Exercise | null {
  const target = sentences[index % Math.max(sentences.length, 1)];
  if (!target) return null;
  // Half the time play a DIFFERENT sentence to make judgment meaningful.
  const swapIn = sentences[(index + 1) % sentences.length];
  const isSame = (dayNumber + index) % 2 === 0 || !swapIn;
  const spoken = isSame ? target.en : (swapIn?.en ?? target.en);
  return {
    id: `d${dayNumber}-lj-${index}`,
    type: "listen-judge",
    skill: "listening",
    requiresAudio: true,
    speakText: spoken,
    displaySentence: target.en,
    isSame,
    zh: target.zh,
  };
}

// ---------------------------------------------------------------------------
// Public generators
// ---------------------------------------------------------------------------

export interface PracticeOptions {
  /** Whether speech synthesis is available on this device. */
  audioAvailable?: boolean;
  includePhonicsPairs?: boolean;
  /** Rule-based planner flags. */
  extraListening?: boolean;
  extraRecall?: boolean;
  /** Ability-gap flags (Phase 3): output push + phonics listening drills. */
  preferProduction?: boolean;
}

export function buildPracticeExercises(
  dayContent: import("@/content/types").DayContent,
  options: PracticeOptions = {},
): Exercise[] {
  const audio = options.audioAvailable ?? isSpeechSupported();
  const pool: VocabEntry[] = dayContent.vocabIds?.length
    ? (dayContent.vocabIds
        .map((id) => findVocab(id))
        .filter(Boolean) as unknown as VocabEntry[])
    : dayContent.vocab;
  const exercises: Exercise[] = [];
  const shuffledVocab = seededShuffle(pool, `d${dayContent.day}-vocab`);

  // 1) Recognition -> recall swap when planner pushes output (Phase 3).
  shuffledVocab.forEach((entry, i) => {
    const asProduction = options.preferProduction === true && i % 2 === 0;
    if (asProduction) {
      exercises.push({
        id: `d${dayContent.day}-rcp-${i}`,
        type: "recall-type",
        skill: "vocabulary",
        itemId: entry.id,
        promptZh: entry.zh,
        answer: entry.word,
      });
    } else {
      exercises.push(buildMcq(`d${dayContent.day}-m-${i}`, entry, pool, "meaning"));
    }
  });

  // 2) Reverse recognition for the first three words.
  shuffledVocab.slice(0, 3).forEach((entry, i) => {
    exercises.push(buildMcq(`d${dayContent.day}-r-${i}`, entry, pool, "reverse"));
  });

  // 3) Active recall (typing) - the bridge from recognizing to producing.
  shuffledVocab.slice(0, 3).forEach((entry, i) => {
    exercises.push({
      id: `d${dayContent.day}-rc-${i}`,
      type: "recall-type",
      skill: "vocabulary",
      itemId: entry.id,
      promptZh: entry.zh,
      answer: entry.word,
    });
  });

  // 4) Pattern work: fill blank + sentence building.
  const fill = buildFillBlank(dayContent.day, 0);
  if (fill) exercises.push(fill);
  const order = buildSentenceOrder(dayContent, 0);
  if (order) exercises.push(order);

  // 5) Listening block (only when audio truly exists).
  if (audio && pool.length >= 2) {
    exercises.push(buildListenWord(`d${dayContent.day}-lw-0`, shuffledVocab[0], pool));
    exercises.push(buildListenWord(`d${dayContent.day}-lw-1`, shuffledVocab[1], pool));
    const lj = buildListenJudge(dayContent.day, dayContent.pattern.practiceSentences, 0);
    if (lj) exercises.push(lj);
  }

  // 6) Shadowing (self-rated; never auto-scored). Requires real audio.
  const shadowSentence = dayContent.pattern.practiceSentences[0];
  if (audio && shadowSentence) {
    exercises.push({
      id: `d${dayContent.day}-sh-0`,
      type: "shadowing",
      skill: "speaking",
      requiresAudio: true,
      speakText: shadowSentence.en,
      en: shadowSentence.en,
      zh: shadowSentence.zh,
    });
  }

  // 7) Adaptive extras from planner rules.
  if (options.extraListening && audio && pool.length >= 2) {
    exercises.push(buildListenWord(`d${dayContent.day}-lwx-0`, shuffledVocab[2] ?? shuffledVocab[0], pool));
    const ljExtra = buildListenJudge(dayContent.day, dayContent.pattern.practiceSentences, 1);
    if (ljExtra) exercises.push(ljExtra);
  }
  if (options.extraRecall) {
    const extraTarget = shuffledVocab[3] ?? shuffledVocab[0];
    exercises.push({
      id: `d${dayContent.day}-rcx-0`,
      type: "recall-type",
      skill: "vocabulary",
      itemId: extraTarget.id,
      promptZh: extraTarget.zh,
      answer: extraTarget.word,
    });
    const orderExtra = buildSentenceOrder(dayContent, 1);
    if (orderExtra) exercises.push(orderExtra);
  }

  return exercises;
}
export interface AssessmentOptions {
  audioAvailable?: boolean;
  includePhonicsPairs?: boolean;
}

/** End-of-day assessment: mixed, slightly harder, tracked like any evidence. */
export function buildAssessmentExercises(
  dayContent: import("@/content/types").DayContent,
  options: AssessmentOptions = {},
): Exercise[] {
  const audio = options.audioAvailable ?? isSpeechSupported();
  const pool: VocabEntry[] = dayContent.vocabIds?.length
    ? (dayContent.vocabIds
        .map((id) => findVocab(id))
        .filter(Boolean) as unknown as VocabEntry[])
    : dayContent.vocab;
  const shuffledVocab = seededShuffle(pool, `d${dayContent.day}-assess`);
  const exercises: Exercise[] = [];

  exercises.push(buildMcq(`d${dayContent.day}-a-m0`, shuffledVocab[0], pool, "meaning"));
  exercises.push(buildMcq(`d${dayContent.day}-a-m1`, shuffledVocab[1] ?? shuffledVocab[0], pool, "meaning"));
  exercises.push(buildMcq(`d${dayContent.day}-a-r0`, shuffledVocab[2] ?? shuffledVocab[0], pool, "reverse"));

  const fillA = buildFillBlank(dayContent.day, 1);
  if (fillA) exercises.push(fillA);

  exercises.push({
    id: `d${dayContent.day}-a-rc0`,
    type: "recall-type",
    skill: "vocabulary",
    itemId: shuffledVocab[0].id,
    promptZh: shuffledVocab[0].zh,
    answer: shuffledVocab[0].word,
  });

  if (audio && pool.length >= 2) {
    exercises.push(buildListenWord(`d${dayContent.day}-a-lw0`, shuffledVocab[1], pool));
  } else {
    exercises.push(buildMcq(`d${dayContent.day}-a-r1`, shuffledVocab[3] ?? shuffledVocab[0], pool, "reverse"));
  }

  const orderA = buildSentenceOrder(dayContent, 2 % Math.max(dayContent.pattern.practiceSentences.length, 1));
  if (orderA) exercises.push(orderA);

  // Phase 3 day extensions: reading / writing / grammar topic drills.
  if (dayContent.reading?.length) {
    const r = dayContent.reading[0];
    exercises.push({
      id: `d${dayContent.day}-rc`,
      type: "reading-comprehension",
      skill: "reading",
      passageId: `d${dayContent.day}`,
      passage: r,
      questionEn: "What is the passage mainly about?",
      optionsEn: ["The daily life described in the passage", "A travel guide", "A recipe"],
      answerIndex: 0,
      explainZh: `短文大意：${r.zh}`,
    });
  }
  if (dayContent.writingPrompt) {
    const w = dayContent.writingPrompt;
    exercises.push({
      id: `d${dayContent.day}-write`,
      type: "guided-production",
      skill: "writing",
      cueZh: w.zh,
      requiredWords: [],
      modelAnswer: w.hintEn,
    });
  }
  if (dayContent.grammarTopicId) {
    exercises.push(
      ...generateGrammarExercises(dayContent.grammarTopicId, dayContent.day).slice(0, 2),
    );
  }
  if (options.includePhonicsPairs && audio && dayContent.phonicsFocus?.pairIds?.length) {
    exercises.push(...buildPhonicsDrills(dayContent.phonicsFocus.pairIds, 2));
  }

  return exercises;
}

// ---------------------------------------------------------------------------
// Review-card -> exercise builder (SRS-driven practice)
// ---------------------------------------------------------------------------

export function buildReviewExercise(

  card: import("@/engines/memory/memory-engine-v0").DueCardView,
  pool: readonly VocabEntry[],
): Exercise | null {  const target = findVocab(card.state.itemId);
  const mode = card.suggestedModes[0];
  const id = `rev-${card.state.itemId.replace(/[^a-z0-9]/gi, "-")}-${mode}`;
  switch (mode) {
    case "recognition":
      return target ? buildMcq(id, target, pool, "meaning") : null;
    case "active-recall":
      return target
        ? {
            id,
            type: "recall-type",
            skill: "vocabulary",
            itemId: target.id,
            promptZh: target.zh,
            answer: target.word,
          }
        : null;
    case "listening-recall":
      return target ? buildListenWord(id, target, pool) : null;
    case "sentence-production": {
      if (!target) return null;
      const tokens = seededShuffle(target.example.en.split(" "), `${id}-tokens`);
      return {
        id,
        type: "sentence-order",
        skill: "grammar",
        itemId: target.id,
        tokens,
        answer: target.example.en,
        zh: target.example.zh,
      };
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Remedial drills (Phase 2): targeted practice on specific items / patterns
// ---------------------------------------------------------------------------

/** Targeted vocabulary drill: recognition + active recall on failed items. */
export function buildItemDrillExercises(
  items: readonly VocabEntry[],
  seedText: string,
): Exercise[] {
  const pool = allVocab();
  const out: Exercise[] = [];
  const ordered = seededShuffle([...items], `drill-${seedText}`);
  ordered.slice(0, 6).forEach((entry, i) => {
    out.push(
      buildMcq(`drill-${seedText}-${i}-m`, entry, pool, i % 3 === 2 ? "reverse" : "meaning"),
    );
    if (i % 2 === 0) {
      out.push({
        id: `drill-${seedText}-${i}-rc`,
        type: "recall-type",
        skill: "vocabulary",
        itemId: entry.id,
        promptZh: entry.zh,
        answer: entry.word,
      });
    }
  });
  return out;
}

/** Grammar drill rebuilt from a day pattern (fill-blank + sentence order). */
export function buildGrammarDrill(patternId: string, salt = 0): Exercise[] {
  const day = DAYS.find((d) => d.pattern.id === patternId);
  if (!day) return [];
  const out: Exercise[] = [];
  const fill = buildFillBlank(day.day, salt % 8);
  if (fill) out.push(fill);
  const order = buildSentenceOrder(day, salt % Math.max(day.pattern.practiceSentences.length, 1));
  if (order) out.push(order);
  return out;
}