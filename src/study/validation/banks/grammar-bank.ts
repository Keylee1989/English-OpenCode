/**
 * Grammar probe bank for the adaptive baseline.
 *
 * Authored for the baseline feature (not course content stuffing): a compact
 * multi-band bank across A1..C2 that lets the adaptive engine bracket a
 * learner's grammar ability. Each item is auto-gradable (choice or correction).
 */
import type { Probe } from "./types";
import type { CefrLevel } from "@/study/validation/adaptive";

function g(
  id: string,
  band: CefrLevel,
  kind: "grammar-choice" | "grammar-correction",
  promptEn: string,
  promptZh: string,
  opts: { options?: string[]; key?: string; tipZh?: string } = {},
): Probe {
  return {
    id: `grammar-${band}-${id}`,
    skill: "grammar",
    band,
    kind,
    productive: kind === "grammar-correction",
    promptEn,
    promptZh,
    options: opts.options,
    key: opts.key,
    tipZh: opts.tipZh,
  };
}

// Compact authoring rows to keep the file readable.
// [band, kind, promptEn, promptZh, options?, key?, tipZh?]
type Row = [
  CefrLevel,
  "grammar-choice" | "grammar-correction",
  string,
  string,
  string[]?,
  string?,
  string?,
];

const ROWS: Row[] = [
  // --- A1 ---
  ["A1", "grammar-choice", "She ___ a student.", "她是一名学生。", ["is", "am", "are"], "is", "第三人称单数用 is。"],
  ["A1", "grammar-choice", "I ___ to school every day.", "我每天去上学。", ["go", "goes", "going"], "go", "主语 I 用动词原形 go。"],
  ["A1", "grammar-choice", "This ___ my book.", "这是我的书。", ["is", "am", "are"], "is", "This 后用 is。"],
  ["A1", "grammar-correction", "She go to work.", "改正：She ___ to work.", undefined, "goes", "一般现在时第三人称单数加 -es。"],
  // --- A2 ---
  ["A2", "grammar-choice", "They ___ watching TV now.", "他们现在正在看电视。", ["are", "is", "be"], "are", "现在进行时 be+doing, they 用 are。"],
  ["A2", "grammar-choice", "I have lived here ___ 2010.", "我从 2010 年起住在这里。", ["since", "for", "at"], "since", "since + 时间点。"],
  ["A2", "grammar-choice", "She ___ her keys yesterday.", "她昨天丢了钥匙。", ["lost", "loses", "has lost"], "lost", "yesterday 用一般过去时。"],
  ["A2", "grammar-correction", "He don't like coffee.", "改正：He ___ like coffee.", undefined, "doesn't", "第三人称否定用 doesn't。"],
  // --- B1 ---
  ["B1", "grammar-choice", "If it rains, we ___ home.", "如果下雨，我们就回家。", ["will stay", "stay", "stayed"], "will stay", "真实条件句主句用 will。"],
  ["B1", "grammar-choice", "The report ___ by the team yesterday.", "报告昨天被团队写了。", ["was written", "is written", "wrote"], "was written", "被动语态过去时。"],
  ["B1", "grammar-choice", "I enjoy ___ books.", "我喜欢读书。", ["reading", "to read", "read"], "reading", "enjoy + -ing。"],
  ["B1", "grammar-correction", "She asked me where did I live.", "改正语序：She asked me ___", undefined, "where I lived", "间接问句用陈述语序。"],
  // --- B2 ---
  ["B2", "grammar-choice", "Had I known, I ___ differently.", "我要是早知道，就会不同处理。", ["would have acted", "acted", "will act"], "would have acted", "与过去事实相反的虚拟条件句。"],
  ["B2", "grammar-choice", "The proposal ___ by all departments.", "该提案已被所有部门批准。", ["has been approved", "is approving", "approves"], "has been approved", "现在完成被动。"],
  ["B2", "grammar-choice", "Not only ___ the budget, but it also missed targets.", "预算不但超支，还没达标。", ["did it exceed", "it exceeded", "it exceeds"], "did it exceed", "Not only 置于句首需部分倒装。"],
  ["B2", "grammar-correction", "Despite he was tired, he kept working.", "改正：___ he was tired, ...", undefined, "Although", "despite 是介词，不能接从句；用 although。"],
  // --- C1 ---
  ["C1", "grammar-choice", "The report, ___ was due on Friday, arrived late.", "那份原定周五交的报告迟到了。", ["which", "that", "what"], "which", "非限定性定语从句用 which。"],
  ["C1", "grammar-choice", "I'd rather you ___ the matter now.", "我宁愿你现在就处理此事。", ["handled", "handle", "to handle"], "handled", "would rather + 从句用过去式虚拟。"],
  ["C1", "grammar-choice", "Only after the trial ___ the full picture clear.", "只有经过审判，全貌才清晰。", ["did", "does", "had"], "did", "Only + 状语前置需倒装。"],
  ["C1", "grammar-correction", "It is imperative that he arrives on time.", "改正：... that he ___ on time.", undefined, "arrive", "it is imperative that 后接动词原形虚拟。"],
  // --- C2 ---
  ["C2", "grammar-choice", "The extent to which ___ remains contested.", "其在多大程度上……仍有争议。", ["the policy succeeded", "did the policy succeed", "the policy to succeed"], "the policy succeeded", "extent to which 引导的定语从句不需倒装。"],
  ["C2", "grammar-choice", "Were it not for funding, the project ___.", "若没有资金，该项目早已中断。", ["would have collapsed", "will collapse", "collapsed"], "would have collapsed", "与现在事实相反的虚拟省略倒装。"],
  ["C2", "grammar-choice", "His proposal is predicated on the assumption that ___.", "他的提议以……为前提。", ["prices remain stable", "prices remaining stable", "the price to remain"], "prices remain stable", "同位语从句用陈述句语序。"],
  ["C2", "grammar-correction", "The committee emphasized the need of expediting approvals.", "改正：the need ___ expediting", undefined, "to expedite / for expediting", "the need to do / for doing 的惯用搭配。"],
];

export const GRAMMAR_BANK: Probe[] = ROWS.map((r, i) =>
  g(String(i).padStart(2, "0"), r[0], r[1], r[2], r[3], {
    options: r[4],
    key: r[5],
    tipZh: r[6],
  }),
);

export function grammarBankForBand(band: CefrLevel): Probe[] {
  return GRAMMAR_BANK.filter((p) => p.band === band);
}
