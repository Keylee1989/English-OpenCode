/**
 * Writing probe bank for the adaptive baseline.
 *
 * Structured written-production prompts across A1..C2 (from simple sentences
 * to argumentative/analytical essays). Scored productively: optionally by the
 * AI `evaluateWriting` grader, else by structured learner self-report.
 */
import type { Probe } from "./types";
import type { CefrLevel } from "@/study/validation/adaptive";

function w(
  id: string,
  band: CefrLevel,
  promptEn: string,
  promptZh: string,
  tipZh: string,
): Probe {
  return {
    id: `writing-${band}-${id}`,
    skill: "writing",
    band,
    kind: "writing-essay",
    productive: true,
    promptEn,
    promptZh,
    tipZh,
  };
}

type Row = [CefrLevel, string, string, string, string];

const ROWS: Row[] = [
  ["A1", "00", "Write two short sentences about yourself.", "写两句关于你自己的短句。", "主谓宾正确即可。"],
  ["A1", "01", "Write a short sentence describing your home.", "用一句英文描述你的家。", "简单句。"],
  ["A1", "02", "Write a basic greeting and a question.", "写一个问候句和一个问句。", "句型基础。"],
  ["A2", "03", "Write a short paragraph about your weekend.", "写一段关于你周末的短文。", "过去时叙述。"],
  ["A2", "04", "Write a brief postcard message to a friend.", "给朋友写一张简短明信片。", "日常语域。"],
  ["A2", "05", "Describe your daily routine in a short paragraph.", "用短文描述你的日常。", "顺序与现在时。"],
  ["B1", "06", "Write a paragraph giving your opinion on fast food.", "写一段关于快餐的观点。", "观点+理由。"],
  ["B1", "07", "Write a short email to a colleague proposing a meeting.", "写一封短邮件建议会议。", "正式邮件语域。"],
  ["B1", "08", "Explain the benefits of reading in a paragraph.", "用一段解释阅读的好处。", "说明性段落。"],
  ["B2", "09", "Write an argumentative essay: should exams be abolished?", "写议论文：应否废除考试？", "论证结构。"],
  ["B2", "10", "Write an analytical paragraph on the causes of stress.", "写分析段：压力的成因。", "因果分析。"],
  ["B2", "11", "Write a persuasive letter arguing for more public parks.", "写信论证增加公园。", "说服语域。"],
  ["C1", "12", "Write an analytical essay evaluating the impact of social media on democracy.", "分析社会媒体对民主的影响。", "分析+证据+语域。"],
  ["C1", "13", "Write a formal report-style summary of a proposed policy.", "撰写正式报告式政策摘要。", "正式报告语域。"],
  ["C1", "14", "Write a critical review of a viewpoint you disagree with.", "撰写对某观点的批判性评论。", "批判性论证。"],
  ["C2", "15", "Write a sophisticated essay arguing for a nuanced position on globalization.", "写一篇圆融立场的全球化议论文。", "微妙论证、高语域。"],
  ["C2", "16", "Produce a formal, register-appropriate policy brief with recommendations.", "撰写正式语域的政策简报并提出建议。", "正式语域、术语准确。"],
  ["C2", "17", "Write an analytical piece synthesizing multiple perspectives with balanced evidence.", "综合分析多方视角并平衡证据。", "综合、平衡、复杂结构。"],
];

export const WRITING_BANK: Probe[] = ROWS.map((row, i) =>
  w(String(i).padStart(2, "0"), row[0], row[1], row[2], row[3]),
);

export function writingBankForBand(band: CefrLevel): Probe[] {
  return WRITING_BANK.filter((p) => p.band === band);
}
