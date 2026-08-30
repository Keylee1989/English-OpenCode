/**
 * AI Tutor service layer (Phase 4-A).
 *
 * High-level, provider-agnostic operations built on top of `IAiProvider`:
 *   - chat()                 raw multi-turn conversation
 *   - generateExplanation()  scaffolded Chinese explanation of a question
 *   - generateExercise()     one practice exercise as strict JSON
 *   - evaluateWriting()      scored writing feedback as strict JSON
 *
 * Every function takes an explicit `IAiProvider`. There is no global provider,
 * no key storage, and no user data sent beyond the context the caller passes.
 * All prompts instruct the model to answer in Chinese-scaffolded style for a
 * zero-basis adult learner.
 */
import type { AiChatMessage, AiCompletionRequest } from "@/ai/provider";
import type { IAiProvider } from "@/ai/provider";
import { isStreamingProvider } from "@/ai/openai-compatible";

// ---------------------------------------------------------------------------
// chat()
// ---------------------------------------------------------------------------

export async function chat(
  provider: IAiProvider,
  messages: AiChatMessage[],
  opts: { temperature?: number; maxTokens?: number; signal?: AbortSignal; feature?: string } = {},
): Promise<AiChatMessage> {
  const request: AiCompletionRequest = {
    messages,
    temperature: opts.temperature ?? 0.7,
    maxTokens: opts.maxTokens,
    signal: opts.signal,
    feature: opts.feature,
  };
  const response = await provider.complete(request);
  return { role: "assistant", content: response.text };
}

// ---------------------------------------------------------------------------
// generateExplanation()
// ---------------------------------------------------------------------------

export interface ExplanationResult {
  answerZh: string;
}

function scaffoldInstruction(scaffoldLevel: string): string {
  switch (scaffoldLevel) {
    case "english-first":
      return "Learner level: advanced. Answer mainly in English; add short Chinese notes only for hard terms.";
    case "balanced":
      return "Learner level: intermediate. Explain bilingually (English example + Chinese explanation).";
    default:
      return "Learner level: beginner. 解释主体用简体中文，例句保留英文并附中文翻译。面向零基础成人，语气耐心、不堆砌术语。";
  }
}

export function buildExplanationMessages(
  questionZh: string,
  contextBlock: string | null,
  scaffoldLevel = "chinese-dominant",
): AiChatMessage[] {
  const system = [
    "你是 English360 的 AI 英语导师，服务中文母语的自学者。",
    scaffoldInstruction(scaffoldLevel),
    contextBlock
      ? "下面是学习者当前状态（仅供个性化参考，不要逐字复述）：\n" + contextBlock
      : "",
  ]
    .filter(Boolean)
    .join("\n");
  return [
    { role: "system", content: system },
    { role: "user", content: questionZh },
  ];
}

export async function generateExplanation(
  provider: IAiProvider,
  questionZh: string,
  options: { contextBlock?: string | null; scaffoldLevel?: string; signal?: AbortSignal } = {},
): Promise<ExplanationResult> {
  const messages = buildExplanationMessages(
    questionZh,
    options.contextBlock ?? null,
    options.scaffoldLevel,
  );
  const reply = await chat(provider, messages, { temperature: 0.4, signal: options.signal, feature: "explanation" });
  return { answerZh: reply.content };
}

/**
 * Streaming variant (Phase 5): yields text deltas while generating, then the
 * full text at the end. Falls back to non-streaming complete() when the
 * provider cannot stream - callers get identical output either way and
 * failures always surface with their real reason.
 */
export async function* streamExplanation(
  provider: IAiProvider,
  questionZh: string,
  options: {
    contextBlock?: string | null;
    scaffoldLevel?: string;
    signal?: AbortSignal;
    /** Extra prior turns when continuing a saved conversation. */
    history?: AiChatMessage[];
    onDelta?: (delta: string) => void;
  } = {},
): AsyncGenerator<{ delta: string } | { full: string }, void, unknown> {
  const base = buildExplanationMessages(
    questionZh,
    options.contextBlock ?? null,
    options.scaffoldLevel,
  );
  const messages = [...base, ...(options.history ?? [])];
  if (isStreamingProvider(provider)) {
    let full = "";
    const iterator = provider.completeStream({
      messages,
      temperature: 0.4,
      signal: options.signal,
    });
    for await (const part of iterator) {
      if (part.done) break;
      if (part.delta) {
        full += part.delta;
        options.onDelta?.(part.delta);
        yield { delta: part.delta };
      }
    }
    yield { full };
  } else {
    const reply = await chat(provider, messages, { temperature: 0.4, signal: options.signal, feature: "explanation" });
    options.onDelta?.(reply.content);
    yield { delta: reply.content };
    yield { full: reply.content };
  }
}

// ---------------------------------------------------------------------------
// generateExercise()
// ---------------------------------------------------------------------------

/** Minimal validated shape of an AI-generated exercise draft. */
export interface GeneratedExerciseDraft {
  type: string;
  skill: "vocabulary" | "grammar" | "listening" | "speaking" | "reading" | "writing";
  en: string;
  zh: string;
  /** For mcq-style drafts: three to five candidate strings. */
  choices?: string[];
  answer?: string;
}

export interface GenerateExerciseOptions {
  skill: GeneratedExerciseDraft["skill"];
  day: number;
  topicHintZh?: string;
  vocabWords?: string[];
  contextBlock?: string | null;
  signal?: AbortSignal;
}

const EXERCISE_JSON_SPEC = [
  "Return STRICT JSON only, no markdown fence, matching exactly:",
  '{"type":"mcq-meaning|fill-blank|translate-zh-en","skill":"vocabulary|grammar|listening|speaking|reading|writing","en":"English prompt sentence","zh":"Chinese hint or translation","choices":["A","B","C"],"answer":"correct choice"}',
  "Rules: choices must contain exactly 3 strings; answer must equal one choice;",
  "for fill-blank use ___ inside en and omit choices/answer.",
].join("\n");

export function parseGeneratedExercise(raw: string): GeneratedExerciseDraft | null {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-z]*\n?/, "").replace(/```\s*$/, "").trim();
  }
  try {
    const obj = JSON.parse(text) as Partial<GeneratedExerciseDraft>;
    if (!obj || typeof obj.en !== "string" || typeof obj.zh !== "string") return null;
    const skills = ["vocabulary", "grammar", "listening", "speaking", "reading", "writing"];
    if (!skills.includes(String(obj.skill))) return null;
    if (!Array.isArray(obj.choices)) {
      // fill-blank / translate style without choices is acceptable.
      return {
        type: String(obj.type ?? "fill-blank"),
        skill: obj.skill as GeneratedExerciseDraft["skill"],
        en: obj.en,
        zh: obj.zh,
      };
    }
    const choices = obj.choices.filter((c): c is string => typeof c === "string");
    if (choices.length < 3) return null;
    if (typeof obj.answer !== "string" || !choices.includes(obj.answer)) return null;
    return {
      type: String(obj.type ?? "mcq-meaning"),
      skill: obj.skill as GeneratedExerciseDraft["skill"],
      en: obj.en,
      zh: obj.zh,
      choices,
      answer: obj.answer,
    };
  } catch {
    return null;
  }
}

export async function generateExercise(
  provider: IAiProvider,
  options: GenerateExerciseOptions,
): Promise<{ ok: true; exercise: GeneratedExerciseDraft } | { ok: false; reasonZh: string }> {
  const vocabLine = options.vocabWords?.length
    ? `优先使用这些词：${options.vocabWords.join(", ")}。`
    : "";
  const contextLine = options.contextBlock
    ? `\n学习者上下文：\n${options.contextBlock}`
    : "";
  const messages: AiChatMessage[] = [
    {
      role: "system",
      content:
        `你是 English360 的练习生成器。为第 ${options.day} 天的学习者生成 1 道练习。\n` +
        `${EXERCISE_JSON_SPEC}\n技能维度：${options.skill}。${vocabLine}${contextLine}`,
    },
    {
      role: "user",
      content: options.topicHintZh ?? `生成一道第 ${options.day} 天水平的 ${options.skill} 练习。`,
    },
  ];
  const reply = await chat(provider, messages, { temperature: 0.6, signal: options.signal, feature: "exercise-gen" });
  const exercise = parseGeneratedExercise(reply.content);
  if (!exercise) {
    return { ok: false, reasonZh: "AI 返回的练习格式无效，已忽略。" };
  }
  return { ok: true, exercise };
}

// ---------------------------------------------------------------------------
// evaluateWriting()
// ---------------------------------------------------------------------------

export interface WritingCorrection {
  wrong: string;
  right: string;
  noteZh: string;
}

export interface WritingEvaluation {
  score: number;
  corrections: WritingCorrection[];
  feedbackZh: string;
}

export interface EvaluateWritingOptions {
  promptEn: string;
  submission: string;
  contextBlock?: string | null;
  signal?: AbortSignal;
}

export function parseWritingEvaluation(raw: string): WritingEvaluation | null {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-z]*\n?/, "").replace(/```\s*$/, "").trim();
  }
  try {
    const obj = JSON.parse(text) as Partial<WritingEvaluation>;
    const score = Number(obj.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) return null;
    const corrections = Array.isArray(obj.corrections)
      ? obj.corrections
          .filter(
            (c): c is WritingCorrection =>
              !!c &&
              typeof c.wrong === "string" &&
              typeof c.right === "string" &&
              typeof c.noteZh === "string",
          )
          .slice(0, 10)
      : [];
    if (typeof obj.feedbackZh !== "string") return null;
    return { score: Math.round(score), corrections, feedbackZh: obj.feedbackZh };
  } catch {
    return null;
  }
}

export async function evaluateWriting(
  provider: IAiProvider,
  options: EvaluateWritingOptions,
): Promise<{ ok: true; evaluation: WritingEvaluation } | { ok: false; reasonZh: string }> {
  const contextLine = options.contextBlock ? `\n学习者水平：\n${options.contextBlock}` : "";
  const messages: AiChatMessage[] = [
    {
      role: "system",
      content:
        "你是 English360 的写作评估器，面向零基础中文成人学习者。\n" +
        'Return STRICT JSON only: {"score":0-100,"corrections":[{"wrong":"","right":"","noteZh":""}],"feedbackZh":""}.\n' +
        "评分标准：可懂度 > 语法 > 词汇。feedbackZh 用鼓励式简体中文，不超过三句。" +
        contextLine,
    },
    {
      role: "user",
      content: `题目：${options.promptEn}\n学生作文：${options.submission}`,
    },
  ];
  const reply = await chat(provider, messages, { temperature: 0.2, signal: options.signal, feature: "writing-review" });
  const evaluation = parseWritingEvaluation(reply.content);
  if (!evaluation) {
    return { ok: false, reasonZh: "AI 返回的评分格式无效，请稍后重试。" };
  }
  return { ok: true, evaluation };
}

// ---------------------------------------------------------------------------
// analyzeError() - 错题分析 (Phase 4-B)
// ---------------------------------------------------------------------------

export interface ErrorAnalysisResult {
  reasonZh: string;
  correctEn: string;
  practiceAdviceZh: string;
}

export interface AnalyzeErrorInput {
  /** What the learner got wrong, e.g. the sentence or word. */
  wrongEn?: string;
  answerText?: string;
  skill: string;
  categoryZh: string;
  descriptionZh?: string;
  /** Knowledge context: confusion partners / related words / grammar node. */
  knowledgeContextZh?: string;
  contextBlock?: string | null;
  signal?: AbortSignal;
}

export function parseErrorAnalysis(raw: string): ErrorAnalysisResult | null {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-z]*\n?/, "").replace(/```\s*$/, "").trim();
  }
  try {
    const obj = JSON.parse(text) as Partial<ErrorAnalysisResult>;
    if (
      typeof obj.reasonZh !== "string" ||
      typeof obj.correctEn !== "string" ||
      typeof obj.practiceAdviceZh !== "string"
    ) {
      return null;
    }
    if (obj.reasonZh.length === 0 || obj.practiceAdviceZh.length === 0) return null;
    return {
      reasonZh: obj.reasonZh,
      correctEn: obj.correctEn,
      practiceAdviceZh: obj.practiceAdviceZh,
    };
  } catch {
    return null;
  }
}

export async function analyzeError(
  provider: IAiProvider,
  input: AnalyzeErrorInput,
): Promise<{ ok: true; analysis: ErrorAnalysisResult } | { ok: false; reasonZh: string }> {
  const contextLine = input.contextBlock ? `\n学习者水平：\n${input.contextBlock}` : "";
  const knowledgeLine = input.knowledgeContextZh
    ? `\n相关知识：${input.knowledgeContextZh}`
    : "";
  const messages: AiChatMessage[] = [
    {
      role: "system",
      content:
        "你是 English360 的错题分析器，服务零基础中文成人学习者。\n" +
        'Return STRICT JSON only: {"reasonZh":"错误原因(中文,1-2句)","correctEn":"正确的英文表达","practiceAdviceZh":"练习建议(中文,1-2句)"}.\n' +
        "correctEn 给出最常见的美式说法；不要编造学习者没写过的内容。" +
        contextLine,
    },
    {
      role: "user",
      content: [
        `错误类别：${input.categoryZh}`,
        `技能：${input.skill}`,
        input.descriptionZh ? `描述：${input.descriptionZh}` : "",
        input.wrongEn ? `错误表达：${input.wrongEn}` : "",
        input.answerText && input.answerText !== input.wrongEn
          ? `学习者原答：${input.answerText}`
          : "",
        knowledgeLine,
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];
  const reply = await chat(provider, messages, { temperature: 0.3, signal: input.signal, feature: "error-analysis" });
  const analysis = parseErrorAnalysis(reply.content);
  if (!analysis) {
    return { ok: false, reasonZh: "AI 返回的分析格式无效，请稍后重试。" };
  }
  return { ok: true, analysis };
}

// ---------------------------------------------------------------------------
// generateDialogue() - 情景对话 (Phase 4-B)
// ---------------------------------------------------------------------------

export interface DialogueRound {
  speaker: "A" | "B";
  en: string;
  zh: string;
}

export interface DialogueDraft {
  sceneZh: string;
  rounds: DialogueRound[];
}

export interface GenerateDialogueInput {
  day: number;
  titleZh: string;
  goalZh: string;
  vocabWords?: string[];
  contextBlock?: string | null;
  signal?: AbortSignal;
}

const DIALOGUE_JSON_SPEC = [
  "Return STRICT JSON only, no markdown fence:",
  '{"sceneZh":"场景一句话(中文)","rounds":[{"speaker":"A","en":"","zh":""},{"speaker":"B","en":"","zh":""}]}',
  "Rules: exactly 5 rounds; speakers must alternate A/B starting with A;",
  "en = natural American English line; zh = its Chinese translation;",
  "use the learner's current lesson vocabulary where possible.",
].join("\n");

export function parseDialogueDraft(raw: string): DialogueDraft | null {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-z]*\n?/, "").replace(/```\s*$/, "").trim();
  }
  try {
    const obj = JSON.parse(text) as Partial<DialogueDraft>;
    if (typeof obj.sceneZh !== "string" || !Array.isArray(obj.rounds)) return null;
    if (obj.rounds.length !== 5) return null;
    const rounds: DialogueRound[] = [];
    for (let i = 0; i < obj.rounds.length; i++) {
      const r = obj.rounds[i] as Partial<DialogueRound>;
      const speaker = r.speaker === "B" ? "B" : "A";
      if (speaker !== (i % 2 === 0 ? "A" : "B")) return null;
      if (typeof r.en !== "string" || r.en.length === 0) return null;
      if (typeof r.zh !== "string") return null;
      rounds.push({ speaker, en: r.en, zh: r.zh });
    }
    return { sceneZh: obj.sceneZh, rounds };
  } catch {
    return null;
  }
}

/** Generate a five-round scenario dialogue for the day's theme. */
export async function generateDialogue(
  provider: IAiProvider,
  input: GenerateDialogueInput,
): Promise<{ ok: true; dialogue: DialogueDraft } | { ok: false; reasonZh: string }> {
  const vocabLine = input.vocabWords?.length
    ? `\n优先使用词汇：${input.vocabWords.join(", ")}。`
    : "";
  const contextLine = input.contextBlock ? `\n学习者上下文：\n${input.contextBlock}` : "";
  const messages: AiChatMessage[] = [
    {
      role: "system",
      content:
        `你是 English360 的情景对话生成器，面向第 ${input.day} 天的学习者（美式英语）。\n` +
        `${DIALOGUE_JSON_SPEC}${vocabLine}${contextLine}`,
    },
    {
      role: "user",
      content:
        `本课主题：${input.titleZh}\n课程目标：${input.goalZh}\n生成一段围绕该主题的 5 轮对话。`,
    },
  ];
  const reply = await chat(provider, messages, { temperature: 0.7, signal: input.signal, feature: "dialogue" });
  const dialogue = parseDialogueDraft(reply.content);
  if (!dialogue) {
    return { ok: false, reasonZh: "AI 返回的对话格式无效（需要恰好 5 轮 A/B 交替），已忽略。" };
  }
  return { ok: true, dialogue };
}

