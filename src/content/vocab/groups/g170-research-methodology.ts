import { cv } from "@/content/vocab/c2-types";

/** Phase 16-A · g170 Research Methodology — 研究方法（topic: research-methodology）. */
export const researchMethodologyRows = [
  cv("longitudinal-study-design", "/lɑːnˈdʒɪːtuːdɪnl stʌˈdi diˈzaɪn/", "n.", "纵向研究设计", "C2", "academic", "written", "对同一对象跨长期重复测量", "A longitudinal study tracked children for a decade.", "一项纵向研究追踪儿童十年。", "a longitudinal cohort study", [], ["cross-sectional"]),
  cv("randomized-controlled-trial", "/ˈræn.də.maɪzd kənˈtroʊld ˈtraɪ.əl/", "n.", "随机对照试验", "C1", "academic", "written", "RCT，因果推断金标准设计", "The drug passed a randomized controlled trial.", "该药物通过了随机对照试验。", "conduct an RCT", ["placebo control"], ["observational"]),
  cv("confounding-variable-issue", "/kənˈfaʊndɪŋ/", "n.", "混淆变量", "C2", "academic", "written", "同时影响自变量与因变量的隐藏因素", "Income is a confounding variable here.", "收入在此是混淆变量。", "control for confounders", [], []),
  cv("blinding-protocol-procedure", "/ˈblaɪndɪŋ/", "n.", "盲法方案", "C2", "academic", "written", "隐藏分组信息以防偏倚的程序", "Double blinding protected the protocol.", "双盲保护了试验方案。", "maintain blinding throughout", [], []),
  cv("sampling-frame-definition", "/ˈsæm.plɪŋ freɪm ˌdef.ɪˈnɪʃ.ən/", "n.", "抽样框定义", "C2", "academic", "written", "从中抽取样本的总体清单", "The sampling frame missed rural users.", "抽样框遗漏了农村用户。", "define the sampling frame", [], []),
  cv("attrition-rate-tracking", "/əˈtrɪʃn/", "n.", "流失率追踪", "C2", "academic", "written", "受试者中途退出比例", "Attrition reached thirty percent.", "流失率高达三成。", "minimize participant attrition", [], []),
  cv("ethics-review-board-approval", "/ˈeθ.ɪks rɪˈvjuː bɔːrd əˈpruː.vəl/", "n.", "伦理审查委员会批准", "C1", "formal", "both", "IRB 对研究的合规审查", "The IRB approved the protocol.", "伦理委员会批准了方案。", "obtain IRB approval", [], []),
  cv("mixed-methods-research-approach", "/mɪkst ˈmeθ.ədz rɪˈsɜːrtʃ əˈproʊtʃ/", "n.", "混合研究方法", "C1", "academic", "written", "定量与定性方法结合的设计", "Mixed methods revealed the mechanism.", "混合方法揭示了机制。", "adopt a mixed-methods design", [], []),
];
