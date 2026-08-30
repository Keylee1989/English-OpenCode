import { cv } from "@/content/vocab/c2-types";

/** Phase 16-A · g169 Academic Argument — 学术论证词汇（topic: academic-argument）. */
export const academicArgumentRows = [
  cv("assert", "/əˈsɜːrt/", "v.", "断言；坚称", "C1", "formal", "written", "比 state 更强，暗示自信但未必已证", "The author asserts that culture drives growth.", "作者断言文化驱动增长。", "assert a claim", ["contend", "maintain"], ["deny"], { topic: "academic-argument" }),
  cv("contention", "/kənˈtenʃn/", "n.", "论点；争论", "C1", "formal", "written", "核心主张（my contention is...）", "My contention is that reform failed.", "我的论点是改革失败了。", "the central contention", ["claim", "thesis"], ["concession"], { topic: "academic-argument" }),
  cv("premise-n2", "/ˈpremɪs/", "n.", "前提；假定", "C1", "academic", "written", "论证赖以成立的基础假设；与 conclusion 相对；质疑前提是最高效反驳", "The argument rests on a false premise.", "该论证建立在错误前提之上。", "question the premise", ["assumption"], ["conclusion"], { commonMistakes: "误拼 promise/premise 混淆", topic: "academic-argument" }),
  cv("rebuttal-n2", "/rɪˈbʌtl/", "n.", "反驳；驳论", "C1", "formal", "written", "针对反方证据的系统回应", "The paper devotes a section to rebuttals.", "论文专设一节进行反驳。", "offer a rebuttal", ["counterargument"], []),
  cv("concede-point", "/kənˈsiːd/", "v.", "承认（某点）成立", "C1", "formal", "both", "学术礼貌策略：先让步后转折", "I concede that costs are real.", "我承认成本确实存在。", "concede that...", [], ["refute outright"], { topic: "academic-argument" }),
  cv("corroboration-n2", "/kəˌrɒbəˈreɪʃn/", "n.", "佐证材料", "C2", "formal", "written", "多来源相互支持的证据集合", "The finding needs corroboration from other labs.", "该发现需要其他实验室佐证。", "seek corroboration", ["confirmation"], []),
  cv("fallacious", "/fəˈleɪʃəs/", "adj.", "谬误的", "C2", "academic", "written", "fallacy 的形容词形式，指推理结构错误", "That is a fallacious inference.", "那是一个谬误推断。", "a fallacious argument", ["unsound"], ["valid"]),
  cv("soundness-of-argument", "/ˈsaʊndnəs/", "n.", "论证可靠性", "C2", "academic", "written", "前提真+推理有效的综合评价", "We tested the soundness of the argument.", "我们检验了论证的可靠性。", "assess soundness", ["validity"], ["flawed reasoning"]),
  cv("qualifier-statement", "/ˈkwɑːlɪfaɪər/", "n.", "限定语；修饰条件", "C1", "academic", "written", "缩小主张范围的词（most/some/often）", "Add qualifiers to avoid overclaiming.", "加限定词避免过度声称。", "use careful qualifiers", ["hedge"], ["absolute claim"]),
  cv("burden-of-rebuttal", "/ˈbɜːrdn əv rɪˈbʌtl/", "n.", "反驳责任", "C2", "academic", "written", "提出新主张一方须先回应反方证据", "The burden of rebuttal shifted to critics.", "反驳责任转移到了批评者身上。", "meet the burden of rebuttal", [], []),
];
