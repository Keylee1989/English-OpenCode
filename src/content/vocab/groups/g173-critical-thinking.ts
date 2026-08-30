import { cv } from "@/content/vocab/c2-types";

/** Phase 16-A · g173 Critical Thinking — 批判性思维（topic: critical-thinking）. */
export const criticalThinkingRows = [
  cv("steelman-argument-practice", "/ˈstiːl.mæn ˈɑːr.ɡjə.mənt ˈpræk.tɪs/", "n.", "最强反方论证练习", "C2", "academic", "both", "把对方观点重构到最有说服力再反驳", "Steelman the argument before attacking it.", "先强化对方论证再反驳。", "steelman opposing views", [], ["straw-man fallacy"]),
  cv("falsifiability-criterion-test", "/ˌfɔːlsɪfaɪəˈbɪləti/", "n.", "可证伪性标准", "C2", "academic", "written", "波普尔：命题须可能被证伪才算科学", "Falsifiability separates science from dogma.", "可证伪性区分科学与教条。", "meet the falsifiability criterion", [], []),
  cv("inference-to-best-explanation", "/ˈɪn.fər.əns tə ðə best ˌeks.pləˈneɪ.ʃən/", "n.", "最佳解释推理", "C2", "academic", "written", "在候选解释中择最优（IBE）", "Inference to the best explanation guided the diagnosis.", "最佳解释推理指导了诊断。", "choose the best explanation", ["abduction"], []),
  cv("second-order-effect-thinking", "/ˈsek.ənd ˈɔːr.dər ɪˈfekt ˈθɪŋ.kɪŋ/", "n.", "二阶效应思考", "C1", "neutral", "both", "评估行动的连锁后果而非直接结果", "Think about second-order effects of subsidies.", "想想补贴的二阶效应。", "consider second-order effects", ["unintended consequences"], []),
  cv("base-rate-neglect-error", "/beɪs reɪt nɪˈɡlekt ˈer.ər/", "n.", "基率忽视错误", "C2", "academic", "written", "忽略基础概率而轻信个案特征", "Base rate neglect inflates perceived risk.", "基率忽视放大了感知风险。", "avoid base rate neglect", [], []),
  cv("socratic-questioning-method", "/sɒkrætiːz/", "n.", "苏格拉底式提问法", "C1", "academic", "both", "以连环追问检验信念的方法", "Socratic questioning exposes hidden assumptions.", "苏格拉底式提问暴露隐藏假设。", "use Socratic questioning", [], []),
];
