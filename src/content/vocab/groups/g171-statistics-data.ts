import { cv } from "@/content/vocab/c2-types";

/** Phase 16-A · g171 Statistics & Data Analysis — 统计与数据分析（topic: statistics）. */
export const statisticsRows = [
  cv("statistical-power-analysis", "/stəˈtɪs.tɪ.kəl ˈpaʊ.ər əˈnæl.ə.sɪs/", "n.", "统计功效分析", "C2", "academic", "written", "检测真实效应的能力（1−β）", "A power analysis set the sample at 200.", "功效分析将样本定为200。", "run a power analysis", [], []),
  cv("regression-to-the-mean-fallacy", "/rɪˈɡreʃ.ən tə ðə miːn ˈfæl.ə.si/", "n.", "均值回归谬误", "C2", "academic", "written", "极端值自然回落被误判为干预效果", "Improvement was regression to the mean.", "改善只是均值回归。", "guard against regression to the mean", [], []),
  cv("outlier-handling-policy", "/ˈaʊtˌlaɪ.ər ˈhæn.dlɪŋ ˈpɑː.lɪ.si/", "n.", "离群值处理策略", "C1", "academic", "written", "识别与处置极端数据点的规则", "Document your outlier handling policy.", "记录你的离群值处理策略。", "trim outliers transparently", [], []),
  cv("confidence-interval-interpretation", "/ˈkɒn.fɪ.dəns ˈɪn.tər.vəl ɪnˌtɜːr.prɪˈteɪ.ʃən/", "n.", "置信区间解读", "C1", "academic", "written", "参数估计的不确定性区间", "The confidence interval excluded zero.", "置信区间不含零。", "report a 95% CI", [], []),
  cv("selection-bias-in-samples", "/sɪˈlek.ʃən ˈbaɪ.əs ɪn ˈsæm.pəlz/", "n.", "样本选择偏差", "C1", "academic", "both", "抽样机制系统性偏离总体", "Online polls suffer selection bias.", "网络投票存在选择偏差。", "correct for selection bias", [], []),
  cv("data-dredging-warning", "/ dredʒɪŋ/", "n.", "数据挖掘出伪相关警告", "C2", "academic", "written", "大量检验后挑选显著结果（p-hacking 近义）", "Data dredging inflates false positives.", "数据挖掘会抬高假阳性。", "accuse sb of data dredging", [], []),
  cv("baseline-covariate-adjustment", "/ˈbeɪs.laɪn koʊˈvɛə.ri.ət əˈdʒʌst.mənt/", "n.", "基线协变量调整", "C2", "academic", "written", "用回归控制初始差异", "We adjusted for baseline covariates.", "我们对基线协变量做了调整。", "adjust for covariates", [], []),
  cv("effect-size-metric-choice", "/ɪˈfekt saɪz ˈme.trɪk tʃɔɪs/", "n.", "效应量指标选择", "C2", "academic", "written", "Cohen's d / OR 等量度选取", "Report an effect size, not just p.", "请报告效应量而非仅 p 值。", "interpret the effect size", [], []),
];
