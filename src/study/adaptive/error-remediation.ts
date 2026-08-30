/**
 * Phase 21 — Error -> Remediation mapping.
 *
 * Most of the error-capture + SRS auto-loop already exists in
 * src/engines/errors (error-analysis-v0.ts, remedial-cards.ts). This module
 * makes the Error -> Remediation CONTRACT explicit and testable as a pure
 * lookup: given an error type, return the remediation path (explanation +
 * drills + production + retest) that the adaptive plan and UI can offer.
 *
 * This builds on the pre-existing ErrorType taxonomy:
 *   recognition-mismatch | recall-failure | spelling | word-order |
 *   listening-mishear | phonics-confusion
 */
import type { SkillKey } from "@/core/types";

export type RemediationSkill = "vocabulary" | "grammar" | "phonics" | "listening" | "reading" | "speaking" | "writing";

export interface RemediationStep {
  nameZh: string;
  briefZh: string;
}

export interface RemediationPlan {
  errorType: string;
  attribution: RemediationSkill;
  titleZh: string;
  steps: RemediationStep[];
  /** Suggested SRS review type (mirrors RemedialType in remedial-cards). */
  srsType: "vocabulary" | "grammar" | "phonics" | "sentence-pattern" | "listening" | null;
}

export interface RemediateInput {
  errorType: string;
  skill?: SkillKey;
  /** e.g. "affect/effect", "past-perfect", a collocation pair, a minimal pair. */
  topic?: string;
}

const DISTINCTION: RemediationStep[] = [
  { nameZh: "辨析说明", briefZh: "一句话讲清二者核心区别" },
  { nameZh: "对比例句", briefZh: "一对对照例句" },
  { nameZh: "搭配练习", briefZh: "正确语境的搭配填空" },
  { nameZh: "主动回忆", briefZh: "看中文/释义产出英文" },
  { nameZh: "产出", briefZh: "用目标词造一句自己的话" },
  { nameZh: "稍后复测", briefZh: "间隔后复测该词/该区别" },
];

const GRAMMAR_STEPS: RemediationStep[] = [
  { nameZh: "语法点讲解", briefZh: "定位到具体语法节点" },
  { nameZh: "定向练习", briefZh: "针对该结构的专项 drill" },
  { nameZh: "例句仿写", briefZh: "给出范例后仿写" },
  { nameZh: "产出练习", briefZh: "用该结构自由造句" },
  { nameZh: "SRS/复测", briefZh: "进入 SRS 间隔复习并复测" },
];

const LISTENING_STEPS: RemediationStep[] = [
  { nameZh: "听力微练习", briefZh: "慢速 + 分句反复" },
  { nameZh: "查看字幕", briefZh: "对照转写文本" },
  { nameZh: "影子跟读", briefZh: "shadowing 模仿节奏连读" },
  { nameZh: "无字幕重听", briefZh: "去掉文本再听一遍" },
  { nameZh: "复测", briefZh: "间隔后复测该句/该段" },
];

const PHONICS_STEPS: RemediationStep[] = [
  { nameZh: "最小对立听辨", briefZh: "听辨易混音对" },
  { nameZh: "对比跟读", briefZh: "A vs B 对比发音" },
  { nameZh: "置于句中", briefZh: "放入整句再听辨" },
  { nameZh: "复测", briefZh: "间隔后复测" },
];

const WORD_ORDER_STEPS: RemediationStep[] = [
  { nameZh: "结构讲解", briefZh: "语序规则说明" },
  { nameZh: "连词成句", briefZh: "乱序重组句子" },
  { nameZh: "跟读例句", briefZh: "建立语感" },
  { nameZh: "产出", briefZh: "按该结构造句" },
];

/**
 * Map an error type to an explicit remediation path. Deterministic.
 */
export function remediateFor(input: RemediateInput): RemediationPlan {
  const topic = input.topic ? `「${input.topic}」` : "";
  switch (input.errorType) {
    case "recognition-mismatch":
      return {
        errorType: input.errorType,
        attribution: "vocabulary",
        titleZh: `词义/辨析混淆 ${topic}`,
        steps: DISTINCTION,
        srsType: "vocabulary",
      };
    case "spelling":
      return {
        errorType: input.errorType,
        attribution: "vocabulary",
        titleZh: `拼写不准确 ${topic}`,
        steps: [
          { nameZh: "拼读示范", briefZh: "按音节拼读" },
          { nameZh: "抄写+拼读", briefZh: "抄写并用打字主动回忆 2 次" },
          { nameZh: "看中→英", briefZh: "中文提示产出英文" },
          { nameZh: "拼写复测", briefZh: "稍后复测拼写" },
        ],
        srsType: "vocabulary",
      };
    case "recall-failure":
      return {
        errorType: input.errorType,
        attribution: "vocabulary",
        titleZh: `能认不能输出 ${topic}`,
        steps: [
          { nameZh: "主动回忆", briefZh: "看中文/释义产出英文" },
          { nameZh: "造句", briefZh: "把词放进一句自己的话" },
          { nameZh: "间隔复测", briefZh: "SRS 复测该词" },
        ],
        srsType: "vocabulary",
      };
    case "word-order":
      return {
        errorType: input.errorType,
        attribution: "grammar",
        titleZh: `语序/结构问题 ${topic}`,
        steps: WORD_ORDER_STEPS,
        srsType: "grammar",
      };
    case "listening-mishear":
      return {
        errorType: input.errorType,
        attribution: "listening",
        titleZh: `听力听辨不足 ${topic}`,
        steps: LISTENING_STEPS,
        srsType: "listening",
      };
    case "phonics-confusion":
      return {
        errorType: input.errorType,
        attribution: "phonics",
        titleZh: `发音混淆 ${topic}`,
        steps: PHONICS_STEPS,
        srsType: "phonics",
      };
    default:
      // Grammar-classified errors or unknowns route through the grammar path.
      return {
        errorType: input.errorType,
        attribution: input.skill === "grammar" ? "grammar" : "grammar",
        titleZh: `语法/结构强化 ${topic}`,
        steps: GRAMMAR_STEPS,
        srsType: "grammar",
      };
  }
}
