/**
 * Speaking probe bank for the adaptive baseline.
 *
 * Open spontaneous/opinion prompts across A1..C2. These are productively
 * scored: either by an optional AI grader or by structured learner self-report
 * (honest degradation, matching the rest of the app). The self-report scale
 * asks the learner to rate whether they could respond fluently/accurately.
 */
import type { Probe } from "./types";
import type { CefrLevel } from "@/study/validation/adaptive";

function s(
  id: string,
  band: CefrLevel,
  promptEn: string,
  promptZh: string,
  tipZh: string,
): Probe {
  return {
    id: `speaking-${band}-${id}`,
    skill: "speaking",
    band,
    kind: "speaking-opinion",
    productive: true,
    promptEn,
    promptZh,
    tipZh,
  };
}

type Row = [CefrLevel, string, string, string, string];

const ROWS: Row[] = [
  ["A1", "00", "What is your name?", "请用英文说出你的名字。", "自我介绍的基础句。"],
  ["A1", "01", "What's your favorite color? Why?", "说说你最喜欢的颜色及原因。", "简短原因表达。"],
  ["A1", "02", "How do you get to work or school?", "说说你如何上班/上学。", "交通相关表达。"],
  ["A2", "03", "Describe your daily routine.", "描述你的一天。", "时间与顺序表达。"],
  ["A2", "04", "What did you do last weekend?", "说说你上个周末做了什么。", "过去时表达。"],
  ["A2", "05", "Describe a meal you enjoyed recently.", "描述最近一餐喜欢的饭菜。", "描述与感受。"],
  ["B1", "06", "Give your opinion: is it better to work from home or in an office?", "表达观点：居家办公好还是办公室好？", "陈述观点与理由。"],
  ["B1", "07", "Explain how you would organize a team project.", "说明你会如何组织团队项目。", "说明步骤。"],
  ["B1", "08", "What are the pros and cons of learning a new language?", "谈谈学习新语言的利弊。", "权衡利弊。"],
  ["B2", "09", "Argue whether social media does more harm than good.", "论证社交媒体弊大于利还是利大于弊。", "结构化论证。"],
  ["B2", "10", "Explain the factors that drive economic inequality.", "解释导致经济不平等的因素。", "多因分析。"],
  ["B2", "11", "Persuade a friend to adopt a healthier lifestyle.", "说服朋友采用更健康的生活方式。", "说服性表达。"],
  ["C1", "12", "Analyze the role of artificial intelligence in modern education.", "分析 AI 在现代教育中的作用。", "分析性论述，权衡利弊。"],
  ["C1", "13", "Evaluate the ethical implications of genetic engineering.", "评价基因工程的伦理影响。", "伦理批评性评价。"],
  ["C1", "14", "Discuss the tension between national security and individual privacy.", "讨论国家安全与个人隐私的张力。", "权衡与平衡。"],
  ["C2", "15", "Critique the argument that free trade is inherently beneficial.", "批评'自由贸易天然有利'的论点。", "批判性反驳。"],
  ["C2", "16", "Synthesize competing perspectives on globalization and propose a nuanced position.", "综合关于全球化的对立观点并提出圆融立场。", "综合与微妙立场。"],
  ["C2", "17", "Deliver a compelling, register-appropriate presentation defending a controversial economic policy.", "做一场语域恰当的演讲，为一则有争议的经济政策辩护。", "高语域、正式表达。"],
];

export const SPEAKING_BANK: Probe[] = ROWS.map((row, i) =>
  s(String(i).padStart(2, "0"), row[0], row[1], row[2], row[3]),
);

export function speakingBankForBand(band: CefrLevel): Probe[] {
  return SPEAKING_BANK.filter((p) => p.band === band);
}
