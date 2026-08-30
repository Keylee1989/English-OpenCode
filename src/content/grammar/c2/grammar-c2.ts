/**
 * Phase 15-B: C2 Grammar Master System.
 *
 * Covers the full grammar range required for American high-school + college
 * writing: sentence architecture, the complete verb system, advanced clauses,
 * subjunctive, passive voice, academic-register devices, and rhetorical
 * structures. Each topic is display/teaching data consumed by the Library;
 * nothing here touches engines or grading.
 */

export type GrammarC2Category =
  | "sentence-structure"
  | "verb-system"
  | "advanced-clauses"
  | "subjunctive"
  | "passive-system"
  | "academic-writing"
  | "advanced-structures";

export interface GrammarC2Topic {
  id: string;
  category: GrammarC2Category;
  titleZh: string;
  titleEn: string;
  explanationZh: string;
  patterns: string[];
  examples: Array<{ en: string; zh: string }>;
  pitfallZh?: string;
}

export const GRAMMAR_C2_TOPICS: readonly GrammarC2Topic[] = [
  // ---------------------------------------------------------------- sentence-structure
  {
    id: "simple-vs-compound-sentences",
    category: "sentence-structure",
    titleZh: "简单句与并列句",
    titleEn: "Simple vs Compound Sentences",
    explanationZh:
      "简单句只有一套主谓结构；并列句用并列连词（and / but / so / yet / or）连接两个独立分句。" +
      "美式写作要点：两个独立分句之间必须用逗号+连词，或分号，不能只用逗号（comma splice 是高频扣分点）。",
    patterns: ["S + V. (simple)", "Independent clause, + and/but/so/yet + independent clause.", "Independent clause; independent clause."],
    examples: [
      { en: "The trial ended.", zh: "审判结束了。（简单句）" },
      { en: "The trial ended, but the debate continued.", zh: "审判结束了，但争论仍在继续。（并列句）" },
      { en: "Costs fell; quality did not.", zh: "成本降了；质量却没有。（分号连接）" },
    ],
    pitfallZh: "错误示例：The trial ended, the debate continued.（逗号粘连）",
  },
  {
    id: "complex-sentences",
    category: "sentence-structure",
    titleZh: "复合句（主从结构）",
    titleEn: "Complex Sentences",
    explanationZh:
      "复合句 = 独立分句 + 从句。从句由从属连词引导（because / although / when / if / while 等），" +
      "不可单独成句。写作中从句前置时通常加逗号，后置时不加。",
    patterns: ["Because/Since + clause, main clause.", "Main clause + although/while/if + clause."],
    examples: [
      { en: "Although costs rose, output held steady.", zh: "尽管成本上升，产出保持稳定。" },
      { en: "Output held steady because automation absorbed costs.", zh: "由于自动化消化了成本，产出保持稳定。" },
    ],
  },
  {
    id: "compound-complex-sentences",
    category: "sentence-structure",
    titleZh: "并列复合句",
    titleEn: "Compound-Complex Sentences",
    explanationZh:
      "至少两个独立分句 + 至少一个从句。学术写作的骨架结构，但一句内不要超过三个分句，否则可读性骤降。",
    patterns: ["Ind. clause, and Ind. clause + because + clause."],
    examples: [
      { en: "Revenue grew, and margins improved because logistics costs dropped.", zh: "收入增长，且因物流成本下降利润率也改善了。" },
    ],
    pitfallZh: "先保证每个分句完整，再叠加层次。",
  },

  // ---------------------------------------------------------------- verb-system
  {
    id: "perfect-aspect-grid",
    category: "verb-system",
    titleZh: "完成时态全景（现在/过去/将来完成）",
    titleEn: "Perfect Aspect Grid",
    explanationZh:
      "have/has done（与现在相关）、had done（过去的过去）、will have done（未来某点前完成）。" +
      "判断口诀：问'截止到什么时候'——截止到现在用 have done，截止到过去用 had done，截止到未来用 will have done。",
    patterns: ["have/has + V3", "had + V3", "will have + V3"],
    examples: [
      { en: "She has finished the report.", zh: "她已经写完了报告。（现在可用）" },
      { en: "By the time police arrived, the suspect had left.", zh: "警察到达时嫌疑人早已离开。" },
      { en: "By 2030, the city will have doubled its transit lines.", zh: "到2030年该市地铁线路将翻倍。" },
    ],
    pitfallZh: "had done 必须有'另一过去事件'作参照点，不能凭空使用。",
  },
  {
    id: "progressive-aspect-grid",
    category: "verb-system",
    titleZh: "进行体全景（含完成进行时）",
    titleEn: "Progressive Aspect Grid",
    explanationZh:
      "be doing 强调进行中的动作；have been doing 强调持续至今并可能继续。" +
      "状态动词（know / believe / own）一般不用进行体。",
    patterns: ["am/is/are + V-ing", "was/were + V-ing", "have been + V-ing"],
    examples: [
      { en: "The committee has been reviewing applications since Monday.", zh: "委员会自周一以来一直在审阅申请。" },
      { en: "I was working when the outage hit.", zh: "断电时我正在工作。" },
    ],
  },
  {
    id: "future-forms-comparison",
    category: "verb-system",
    titleZh: "将来表达四法辨析",
    titleEn: "Future Forms Compared",
    explanationZh:
      "will＝临时决定/预测；be going to＝既有打算/有迹象；现在进行时＝已安排的日程；" +
      "一般现在时＝时刻表性未来。选错不致命，但母语者一听便知语感。",
    patterns: ["will + V", "be going to + V", "be + V-ing (arriving)", "S + V-s (the train leaves)"],
    examples: [
      { en: "I'll help you with that.", zh: "（临时起意）我来帮你。" },
      { en: "We're going to expand next year.", zh: "（既定计划）我们明年要扩张。" },
      { en: "The board is meeting at noon.", zh: "董事会中午开会（已排定）。" },
    ],
  },
  {
    id: "modal-verbs-nuance",
    category: "verb-system",
    titleZh: "情态动词的力度梯度",
    titleEn: "Modal Verbs by Strength",
    explanationZh:
      "must > have to > should > could/might。正式建议用 should；" +
      "法律强制用 must；委婉推测用 might / could。学术 hedging 首选 may / might / appear to。",
    patterns: ["must/have to + V (强义务)", "should + V (建议)", "might/could + V (弱可能)"],
    examples: [
      { en: "Applicants must submit transcripts.", zh: "申请人必须提交成绩单。（硬性规定）" },
      { en: "You should double-check the figures.", zh: "你应该复核一下数字。（建议）" },
      { en: "The delay could reflect seasonal demand.", zh: "延误可能反映季节性需求。（弱推测）" },
    ],
  },
  {
    id: "modal-perfect-system",
    category: "verb-system",
    titleZh: "情态动词 + 完成时（modal perfect）",
    titleEn: "Modal Perfect System",
    explanationZh:
      "对过去的推测、批评与遗憾：must have done（一定做了）、can't have done（不可能做过）、" +
      "should have done（本应做而未做）、could have been done（本可以被…）、might have been overlooked（可能被忽视了）。",
    patterns: ["must/can't/might/could + have + V3", "should have + V3", "could have been + V3"],
    examples: [
      { en: "She must have missed the notification.", zh: "她肯定是没看到通知。" },
      { en: "We should have tested earlier.", zh: "我们本该早点测试。" },
      { en: "The flaw might have been overlooked during review.", zh: "这个缺陷可能在评审中被忽视了。" },
    ],
    pitfallZh: "should have done ≠ should do：前者是事后批评，后者是当下建议。",
  },

  // ---------------------------------------------------------------- advanced-clauses
  {
    id: "noun-clauses",
    category: "advanced-clauses",
    titleZh: "名词性从句",
    titleEn: "Noun Clauses",
    explanationZh:
      "整个从句充当主语/宾语/表语。引导词 that 在宾语位置常可省略；whether 与 if 都可表'是否'，" +
      "但介词后、句首只能用 whether。",
    patterns: ["That + clause + V.", "I wonder whether/if + clause.", "What + clause + is ..."],
    examples: [
      { en: "That prices would fall seemed unlikely.", zh: "物价会下跌似乎不太可能。（作主语）" },
      { en: "Whether we proceed depends on funding.", zh: "是否推进取决于资金。" },
    ],
  },
  {
    id: "relative-clauses-defining-nondefining",
    category: "advanced-clauses",
    titleZh: "定语从句：限定与非限定",
    titleEn: "Relative Clauses: Defining vs Non-defining",
    explanationZh:
      "限定性从句不加逗号（界定是哪一个）；非限定性从句加逗号（补充说明，用 which/who）。" +
      "非限定从句不能用 that。which 还可以指代前面整句话。",
    patterns: ["N + that/which + clause", "N, which + clause,", "..., who + clause,"],
    examples: [
      { en: "The report that leaked caused a stir.", zh: "泄露的那份报告引起了轰动。（限定）" },
      { en: "The report, which leaked in May, caused a stir.", zh: "那份五月泄露的报告引起了轰动。（非限定）" },
    ],
  },
  {
    id: "reduced-relative-clauses",
    category: "advanced-clauses",
    titleZh: "缩略定语从句",
    titleEn: "Reduced Relative Clauses",
    explanationZh:
      "who/which + be 可省略（主动留 V-ing，被动留 V3）；" +
      "书面语极常见：anyone wishing to apply = anyone who wishes to apply。",
    patterns: ["N + V-ing ... (= who + V)", "N + V3 ... (= which is + V3)"],
    examples: [
      { en: "Anyone wishing to apply must register online.", zh: "想申请的人必须在线注册。" },
      { en: "The systems installed last year are outdated.", zh: "去年安装的系统已过时。" },
    ],
    pitfallZh: "-ing 分词的逻辑主语必须是先行词本身，否则就是垂悬修饰。",
  },
  {
    id: "adverb-clause-reduction",
    category: "advanced-clauses",
    titleZh: "状语从句及其缩略",
    titleEn: "Adverb Clauses & Reduction",
    explanationZh:
      "while/before/after/though 引导的从句，当主从句主语一致时可缩略为 V-ing / V-ed：" +
      "While he was reviewing the data, he found... → While reviewing the data, he found...",
    patterns: ["While + V-ing, main clause.", "Though + V3, main clause."],
    examples: [
      { en: "While reviewing the data, she spotted the anomaly.", zh: "审数据时她发现了异常。" },
      { en: "Though exhausted, the team pushed on.", zh: "尽管筋疲力尽，团队仍继续推进。" },
    ],
    pitfallZh: "主从句主语不一致时禁止缩略（垂悬分词）。",
  },

  // ---------------------------------------------------------------- subjunctive
  {
    id: "subjunctive-unreal-conditionals",
    category: "subjunctive",
    titleZh: "虚拟条件句三档",
    titleEn: "Unreal Conditionals",
    explanationZh:
      "二档（与现在相反）：If I were..., I would...；三档（与过去相反）：If I had known, I would have...；混合档：If I had studied harder, I would be rich now（过去条件+现在结果）。",
    patterns: ["If + S + were/V-ed, S + would + V", "If + S + had + V3, S + would have + V3"],
    examples: [
      { en: "If I were the manager, I would restructure the team.", zh: "如果我是经理，我会重组团队。" },
      { en: "Had we known the risks, we would have acted sooner.", zh: "早知风险，我们本会更快行动。" },
    ],
    pitfallZh: "If I were he 用 were 不用 was 是正式规范。",
  },
  {
    id: "subjunctive-mandative",
    category: "subjunctive",
    titleZh: "命令式虚拟（mandative subjunctive）",
    titleEn: "Mandative Subjunctive",
    explanationZh:
      "insist / demand / require / suggest / essential / vital 之后的 that 从句用动词原形（美式规范），" +
      "英式常用 should + V。这是美式学术写作的标志性语法。",
    patterns: ["demand/insist/essential that + S + (should) V原形"],
    examples: [
      { en: "It is essential that every applicant be interviewed.", zh: "每位申请人都必须被面试，这至关重要。" },
      { en: "The board demanded that he resign immediately.", zh: "董事会要求他立即辞职。" },
    ],
    pitfallZh: "He be（不是 He is / He being）——第三人称也不加 s。",
  },

  // ---------------------------------------------------------------- passive-system
  {
    id: "passive-across-tenses",
    category: "passive-system",
    titleZh: "被动语态全时态速查",
    titleEn: "Passive Across Tenses",
    explanationZh:
      "公式：be 的对应时态 + V3。学术写作用被动隐藏施动者以突出方法与结果，" +
      "但不要连续超过三句被动，否则头重脚轻。",
    patterns: ["is/are/was/were + V3", "has been + V3", "will be + V3", "can/must be + V3"],
    examples: [
      { en: "The samples were analyzed twice.", zh: "样本被分析了两次。" },
      { en: "All applications must be submitted online.", zh: "所有申请必须在线提交。" },
    ],
  },
  {
    id: "passive-infinitive-gerund",
    category: "passive-system",
    titleZh: "被动不定式与被动动名词",
    titleEn: "Passive Infinitive & Gerund",
    explanationZh: "to be done 表'待被做'；being done 表'正在被做/被做这件事'。needs doing ≈ needs to be done。",
    patterns: ["needs to be + V3 = needs + V-ing", "being + V3", "to be + V3"],
    examples: [
      { en: "The report needs to be revised before Friday.", zh: "报告需要在周五前修订。" },
      { en: "He resents being micromanaged.", zh: "他反感被人事事插手。" },
    ],
  },
  {
    id: "reporting-passive-it-construction",
    category: "passive-system",
    titleZh: "报道性被动（It is said that...）",
    titleEn: "Reporting Passive",
    explanationZh: "转述消息的两条路径：It is reported that + 句子；或 S + is reported to + V。",
    patterns: ["It is believed/reported/said that + clause.", "S + is believed/reported to + V."],
    examples: [
      { en: "It is estimated that costs will rise five percent.", zh: "据估计成本将上升百分之五。" },
      { en: "The firm is rumored to be exploring a sale.", zh: "传闻该公司在探索出售。" },
    ],
  },

  // ---------------------------------------------------------------- academic-writing
  {
    id: "hedging-language",
    category: "academic-writing",
    titleZh: "学术缓冲语（hedging）",
    titleEn: "Hedging Language",
    explanationZh:
      "学术英语的核心礼貌策略：把断言软化成可辩护的主张。工具箱：appear/seem/tend to、" +
      "may/might/could、suggest/indicate（而非 prove）、likely/unlikely。",
    patterns: ["Evidence suggests that ...", "This may indicate ...", "X appears to + V"],
    examples: [
      { en: "The evidence suggests a modest effect.", zh: "证据显示存在轻微效应。" },
      { en: "This finding may indicate sampling bias.", zh: "这一发现可能表明存在抽样偏差。" },
    ],
    pitfallZh: "证明(prove)一词在实证写作中几乎永远过强。",
  },
  {
    id: "nominalization",
    category: "academic-writing",
    titleZh: "名词化（nominalization）",
    titleEn: "Nominalization",
    explanationZh: "动词/形容词 → 名词，让句子聚焦概念而非动作，是学术文体的密度来源：decide → decision。",
    patterns: ["V → -tion/-ment/-ance 名词", "The government's decision to ..."],
    examples: [
      { en: "The government decided to expand → The government's decision to expand...", zh: "'政府决定扩张'→'政府的扩张决定'" },
      { en: "Failure to comply results in penalties.", zh: "未能遵守规定将导致处罚。" },
    ],
    pitfallZh: "名词化堆叠会造成僵尸名词，每段保留一到两处即可。",
  },
  {
    id: "cohesion-devices",
    category: "academic-writing",
    titleZh: "衔接与连贯装置",
    titleEn: "Cohesion Devices",
    explanationZh:
      "this/these/thus/such 回指前文；however/moreover/consequently 组织论证方向。" +
      "规则：this 后面最好跟一个名词（this approach），避免裸 this。",
    patterns: ["This + noun + V ...", "However, ... Moreover, ... Consequently, ..."],
    examples: [
      { en: "This approach reduces variance.", zh: "这一方法能降低方差。" },
      { en: "Consequently, both teams adopted the standard.", zh: "因此两个团队都采用了该标准。" },
    ],
  },
  {
    id: "parallelism-rules",
    category: "academic-writing",
    titleZh: "平行结构（parallelism）",
    titleEn: "Parallelism",
    explanationZh:
      "并列成分必须同形：动名词对动名词、不定式对不定式。" +
      "not only A but also B / either A or B 中 A、B 结构完全对称。",
    patterns: ["not only X but also Y (same form)", "A, B, and C (same form)"],
    examples: [
      { en: "The course teaches reading, writing, and critical thinking.", zh: "课程教授阅读、写作与批判性思维。" },
      { en: "(wrong) She likes hiking, swimming, and to bike.", zh: "错误示范：hiking/swimming 与 to bike 不对称。" },
    ],
  },
  {
    id: "emphasis-structures-cleft",
    category: "advanced-structures",
    titleZh: "强调句（cleft sentences）",
    titleEn: "Cleft Sentences",
    explanationZh:
      "把要强调的部分拆出来：It was X that...（强调主语/宾语）；What ... is/was ...（强调主语内容或行为）。",
    patterns: ["It was + X + that/who + ...", "What + S + V + is/was + emphasized part"],
    examples: [
      { en: "It was the second experiment that changed everything.", zh: "改变一切的是第二次实验。" },
      { en: "What matters is consistency, not intensity.", zh: "重要的是坚持，而不是强度。" },
    ],
  },
  {
    id: "inversion-for-emphasis",
    category: "advanced-structures",
    titleZh: "倒装强调（inversion）",
    titleEn: "Inversion for Emphasis",
    explanationZh:
      "否定副词提前引发部分倒装（助动词提前）：Rarely do we see...；Not only did they... but also..." +
      "；条件倒装 Had I known... / Were it not for... / Should you need...",
    patterns: ["Rarely/Seldom/Never + aux + S + V", "Not only + aux + S + V, but also ...", "Had/Were/Should + S + ..."],
    examples: [
      { en: "Rarely do we see such discipline.", zh: "如此自律实属罕见。" },
      { en: "Not only did sales rise, but churn also fell.", zh: "销量不但涨了，流失率还降了。" },
    ],
  },
  {
    id: "fronting-and-ellipsis",
    category: "advanced-structures",
    titleZh: "前置与省略（fronting & ellipsis）",
    titleEn: "Fronting & Ellipsis",
    explanationZh:
      "把补语/状语提到句首制造焦点（Fronting）：To the list we add one more item." +
      "省略（ellipsis）删去重复成分让行文紧凑：She can code, and he can, too.",
    patterns: ["Complement/Adverbial + aux + S + V", "省略重复的动词/助动词"],
    examples: [
      { en: "To the budget we must add legal fees.", zh: "预算之外还须加上律师费。" },
      { en: "Some prefer tea; others, coffee.", zh: "有人爱茶，有人爱咖啡。（省略 prefer）" },
    ],
  },
  {
    id: "discourse-markers-academic",
    category: "advanced-structures",
    titleZh: "学术话语标记",
    titleEn: "Academic Discourse Markers",
    explanationZh:
      "组织论证的路标：引入(furthermore/in addition)、对比(by contrast/nonetheless)、" +
      "因果(therefore/as a result)、让步(admittedly/granted)、总结(in sum/taken together)。",
    patterns: ["Furthermore, ... / By contrast, ... / In sum, ..."],
    examples: [
      { en: "Admittedly, the sample was small; nonetheless, the trend held.", zh: "诚然样本很小；但趋势依然成立。" },
      { en: "Taken together, the studies point to one conclusion.", zh: "综合来看，这些研究指向同一结论。" },
    ],
  },
];

export const GRAMMAR_C2_CATEGORIES: readonly GrammarC2Category[] = [
  "sentence-structure",
  "verb-system",
  "advanced-clauses",
  "subjunctive",
  "passive-system",
  "academic-writing",
  "advanced-structures",
];

export function getGrammarC2Topics(category?: GrammarC2Category): GrammarC2Topic[] {
  return category ? GRAMMAR_C2_TOPICS.filter((t) => t.category === category) : [...GRAMMAR_C2_TOPICS];
}
