/**
 * Reading probe bank for the adaptive baseline.
 *
 * Compact authored micro-passages + comprehension/inference MCQs across
 * A1..C2. Authored as the assessment vehicle (real learning-value texts, not
 * quantity padding). Each item is auto-gradable.
 */
import type { Probe } from "./types";
import type { CefrLevel } from "@/study/validation/adaptive";

function r(
  id: string,
  band: CefrLevel,
  passageEn: string,
  passageZh: string,
  q: string,
  qZh: string,
  options: string[],
  key: string,
  tipZh: string,
): Probe {
  return {
    id: `reading-${band}-${id}`,
    skill: "reading",
    band,
    kind: "reading-choice",
    productive: false,
    promptEn: `${passageEn}\n\nQuestion: ${q}`,
    promptZh: `${passageZh}\n\n问题：${qZh}`,
    options,
    key,
    tipZh,
  };
}

interface Row {
  band: CefrLevel;
  passageEn: string;
  passageZh: string;
  q: string;
  qZh: string;
  options: string[];
  key: string;
  tipZh: string;
}

const ROWS: Row[] = [
  {
    band: "A1",
    passageEn: "Tom is a cat. He is white and small. He likes milk.",
    passageZh: "汤姆是一只猫。白色，很小。喜欢牛奶。",
    q: "What is Tom?",
    qZh: "汤姆是什么？",
    options: ["A cat", "A dog", "A bird"],
    key: "A cat",
    tipZh: "第一句直接说明 Tom is a cat。",
  },
  {
    band: "A1",
    passageEn: "I get up at seven. I eat breakfast. Then I go to school.",
    passageZh: "我七点起床，吃早饭，然后去上学。",
    q: "What do I do first?",
    qZh: "我先做什么？",
    options: ["Eat breakfast", "Get up", "Go to school"],
    key: "Get up",
    tipZh: "顺序是 get up → breakfast → school。",
  },
  {
    band: "A1",
    passageEn: "The book is on the table. It is blue.",
    passageZh: "书在桌子上，是蓝色的。",
    q: "Where is the book?",
    qZh: "书在哪里？",
    options: ["On the table", "On the floor", "In the bag"],
    key: "On the table",
    tipZh: "on the table = 在桌子上。",
  },
  {
    band: "A2",
    passageEn: "Marie goes to the market every Saturday. She buys fresh fruit and vegetables for the week.",
    passageZh: "玛丽每周六去市场，为一周购买新鲜果蔬。",
    q: "Why does Marie go to the market?",
    qZh: "玛丽为什么要去市场？",
    options: ["To buy food for the week", "To meet a friend", "To work there"],
    key: "To buy food for the week",
    tipZh: "她为整周购买水果蔬菜。",
  },
  {
    band: "A2",
    passageEn: "The train was late, so we missed the start of the film.",
    passageZh: "火车晚点，我们错过了电影开头。",
    q: "Why did they miss the start?",
    qZh: "他们为什么错过开头？",
    options: ["The train was late", "They were lost", "The film was long"],
    key: "The train was late",
    tipZh: "so 表示因果：火车晚点导致错过。",
  },
  {
    band: "A2",
    passageEn: "Anna felt tired, but she continued working until nine.",
    passageZh: "安娜很累，但一直工作到九点。",
    q: "What does 'continued' mean here?",
    qZh: "continued 在这里是什么意思？",
    options: ["kept going", "stopped", "started"],
    key: "kept going",
    tipZh: "continued = 继续；but 表转折。",
  },
  {
    band: "B1",
    passageEn: "Despite the heavy rain, volunteers distributed supplies to the flooded villages throughout the day.",
    passageZh: "尽管大雨，志愿者整日向受灾村庄分发物资。",
    q: "How did the volunteers react to the rain?",
    qZh: "志愿者对大雨的态度如何？",
    options: ["They kept working anyway", "They stopped for the rain", "They postponed the work"],
    key: "They kept working anyway",
    tipZh: "Despite 表让步：尽管下雨仍继续。",
  },
  {
    band: "B1",
    passageEn: "The manager assured the team that the deadline would be met, though it required overtime.",
    passageZh: "经理向团队保证能按时完成，尽管需要加班。",
    q: "What did the manager do?",
    qZh: "经理做了什么？",
    options: ["Reassured the team about the deadline", "Quit the project", "Extended the deadline"],
    key: "Reassured the team about the deadline",
    tipZh: "assure ... that = 向……保证。",
  },
  {
    band: "B1",
    passageEn: "Although the device was expensive, its long battery life made it a good investment.",
    passageZh: "虽然设备昂贵，但长续航使它物有所值。",
    q: "What is the writer's attitude to the device?",
    qZh: "作者对设备的态度？",
    options: ["Positive overall", "Dismissive", "Neutral and unclear"],
    key: "Positive overall",
    tipZh: "a good investment 表明总体正面。",
  },
  {
    band: "B2",
    passageEn: "The study suggests that remote work boosts productivity, yet it also blurs the boundary between professional and personal time, leaving many employees chronically fatigued.",
    passageZh: "研究表明远程办公提升生产力，但也模糊工作与个人时间的界限，使许多人长期疲惫。",
    q: "The author implies that remote work is ___.",
    qZh: "作者暗示远程办公是……",
    options: ["a mixed trade-off", "unambiguously beneficial", "clearly harmful"],
    key: "a mixed trade-off",
    tipZh: "既提升生产力又有代价，故为折中取舍。",
  },
  {
    band: "B2",
    passageEn: "Critics contend that the reform, while popular, risks undermining long-term fiscal stability.",
    passageZh: "批评者认为该改革虽受欢迎，却可能损害长期财政稳定。",
    q: "What do critics suggest about the reform?",
    qZh: "批评者暗示什么？",
    options: ["It may harm future finances", "It is universally supported", "It has no risks"],
    key: "It may harm future finances",
    tipZh: "risks undermining fiscal stability = 可能危害财政稳定。",
  },
  {
    band: "B2",
    passageEn: "Having anticipated the downturn, the firm had already diversified its revenue streams, which cushioned the impact.",
    passageZh: "由于预见到衰退，公司已多元化收入来源，缓冲了冲击。",
    q: "Why was the firm's impact softened?",
    qZh: "公司为何冲击较小？",
    options: ["Earlier diversification", "Government aid", "Higher prices"],
    key: "Earlier diversification",
    tipZh: "提前多元化是缓冲原因。",
  },
  {
    band: "C1",
    passageEn: "The author's argument rests on a premise that is not universally accepted: that economic growth invariably translates into social wellbeing.",
    passageZh: "作者的论证基于一个未被普遍接受的前提：经济增长必然带来社会福祉。",
    q: "The author's reasoning is said to ___.",
    qZh: "作者的推理被认为……",
    options: ["depend on a contested assumption", "be empirically proven", "ignore growth entirely"],
    key: "depend on a contested assumption",
    tipZh: "rests on a premise not universally accepted = 依赖有争议的前提。",
  },
  {
    band: "C1",
    passageEn: "However persuasive the rhetoric, the central claim remains vulnerable to countervailing evidence.",
    passageZh: "无论言辞多么有说服力，核心主张仍易受反证冲击。",
    q: "The attitude toward the central claim is ___.",
    qZh: "对核心主张的态度是……",
    options: ["sceptical", "approving", "indifferent"],
    key: "sceptical",
    tipZh: "vulnerable to countervailing evidence = 对相反证据脆弱，即持怀疑。",
  },
  {
    band: "C1",
    passageEn: "The novel's merit lies less in its plot than in the subtlety with which it portrays moral ambiguity.",
    passageZh: "该小说的价值不在情节，而在刻画道德模糊性的微妙。",
    q: "What is the main strength of the novel?",
    qZh: "小说主要优点是什么？",
    options: ["Nuanced characterization", "Fast-paced plot", "Simple themes"],
    key: "Nuanced characterization",
    tipZh: "subtlety in portraying moral ambiguity = 微妙的刻画。",
  },
  {
    band: "C2",
    passageEn: "The treatise, while meticulous in its scholarship, occasionally lapses into obscurantism that obscures rather than illuminates its thesis.",
    passageZh: "这篇论著虽学术严谨，却时而堕入晦涩，反而妨碍而非阐明主旨。",
    q: "The overall assessment of the treatise is ___.",
    qZh: "对论著的总体评价是……",
    options: ["critical yet respectful", "wholly dismissive", "unreservedly admiring"],
    key: "critical yet respectful",
    tipZh: "meticulous 是肯定，obscurantism 是批评，故为有保留的批评。",
  },
  {
    band: "C2",
    passageEn: "The committee's findings, far from settling the dispute, have served only to animate a fresh round of contention among the parties.",
    passageZh: "委员会的结论远未平息争论，反而激起新一轮争议。",
    q: "The findings have ___.",
    qZh: "结论产生了什么作用？",
    options: ["intensified the dispute", "resolved the dispute", "been ignored completely"],
    key: "intensified the dispute",
    tipZh: "far from settling … animate fresh contention = 反而激化争议。",
  },
  {
    band: "C2",
    passageEn: "Any appraisal of the policy must account for its differential impact across income cohorts, a dimension conspicuously absent from the official evaluation.",
    passageZh: "任何对该政策的评价都须考虑不同收入群体的差异化影响，而官方评估明显缺失这一维度。",
    q: "The official evaluation is criticised for ___.",
    qZh: "官方评估因何受批评？",
    options: ["ignoring distributional impact", "being too technical", "overemphasising fairness"],
    key: "ignoring distributional impact",
    tipZh: "conspicuously absent = 明显缺失分布影响维度。",
  },
];

export const READING_BANK: Probe[] = ROWS.map((row, i) =>
  r(
    String(i).padStart(2, "0"),
    row.band,
    row.passageEn,
    row.passageZh,
    row.q,
    row.qZh,
    row.options,
    row.key,
    row.tipZh,
  ),
);

export function readingBankForBand(band: CefrLevel): Probe[] {
  return READING_BANK.filter((p) => p.band === band);
}
