/**
 * Phase 15-G: C2 Writing Task Bank — 100 prompts across five genres.
 * AI review reuses the existing evaluateWriting() service (grammar /
 * vocabulary / coherence / register) — no new scoring engine, no schema.
 */

export type EssayGenre = "argumentative" | "analytical" | "persuasive" | "report" | "summary";

export interface RubricBand {
  label: string;
  descriptorZh: string;
}

export interface RubricDimension {
  nameZh: string;
  nameEn: string;
  weight: number;
  bands: RubricBand[];
}

export interface WritingRubric {
  scoreRange: [number, number];
  dimensions: RubricDimension[];
}

export interface WritingTask {
  id: string;
  number: number;
  genre: EssayGenre;
  promptEn: string;
  targetWords: [number, number];
  focusZh: string;
  rubric: WritingRubric;
}

const BAND_LABELS = ["优秀 (Exemplary)", "良好 (Proficient)", "合格 (Developing)", "需改进 (Beginning)"] as const;

function rub(dimensions: Array<{ nameZh: string; nameEn: string; weight: number; bands: string[] }>): WritingRubric {
  return {
    scoreRange: [0, 100],
    dimensions: dimensions.map((d) => ({
      nameZh: d.nameZh,
      nameEn: d.nameEn,
      weight: d.weight,
      bands: d.bands.map((descriptor, j) => ({
        label: BAND_LABELS[j],
        descriptorZh: descriptor,
      })),
    })),
  };
}

const RUBRICS_BY_GENRE: Record<EssayGenre, WritingRubric> = {
  argumentative: rub([
    { nameZh: "论点与立场", nameEn: "Thesis & Stance", weight: 20, bands: ["立场鲜明、定义清晰，能为全文提供可检验的主线", "立场清楚但定义略有模糊", "立场可辨识但对立点界定不足", "立场含糊或前后不一致"] },
    { nameZh: "论据与反论", nameEn: "Evidence & Counterargument", weight: 30, bands: ["多源证据充分、逻辑严整并有效预判反方", "证据相关且有让步，但反论深度不足", "有例证但多为断言，反论流于表面", "证据缺失或与论点脱节，无反论"] },
    { nameZh: "结构与衔接", nameEn: "Cohesion & Coherence", weight: 20, bands: ["论证链完整，衔接词精准，段落推进清楚", "结构清晰，衔接基本得当", "结构松散，部分衔接生硬", "结构混乱，逻辑跳跃"] },
    { nameZh: "语言与语域", nameEn: "Language & Register", weight: 15, bands: ["语法准确，词汇地道，语域切合议论文", "少量错误不影响理解，语域总体得当", "错误较多削弱信度，语域偶有失准", "错误密集，语域明显失当"] },
    { nameZh: "任务符合度", nameEn: "Task Fulfilment", weight: 15, bands: ["完整回应题目并达标字数", "回应较完整，字数略偏", "部分偏离任务要求", "严重偏题或字数不足"] },
  ]),
  analytical: rub([
    { nameZh: "分析框架", nameEn: "Analytical Framework", weight: 25, bands: ["选用的框架贴切且运用娴熟", "框架基本适用但运用偶有偏差", "框架选择勉强，运用生硬", "无明确框架或误用"] },
    { nameZh: "机制追踪", nameEn: "Mechanism Tracing", weight: 30, bands: ["端到端机制链完整、证据层层递进", "机制主要环节清晰，个别缺口", "机制描述跳跃，因果不连贯", "多并列现象而缺因果分析"] },
    { nameZh: "变量与边界", nameEn: "Variables & Limitations", weight: 20, bands: ["主动识别混杂变量并讨论边界", "意识到部分限制条件", "忽略明显限制", "不区分相关与因果"] },
    { nameZh: "结构与衔接", nameEn: "Cohesion & Coherence", weight: 15, bands: ["逻辑推进清晰，衔接精准", "结构清楚，衔接基本得当", "结构松散或生硬", "结构混乱"] },
    { nameZh: "语言与语域", nameEn: "Language & Register", weight: 10, bands: ["语法准确、词汇地道、学术语域切合", "少量错误，语域总体得当", "错误较多削弱说服力", "错误密集"] },
  ]),
  persuasive: rub([
    { nameZh: "受众意识", nameEn: "Audience Awareness", weight: 25, bands: ["精准识别受众关切并据此组织诉求", "受众意识清楚但针对性略弱", "受众定位模糊", "未考虑受众"] },
    { nameZh: "说服策略", nameEn: "Persuasion Strategy", weight: 30, bands: ["情感/逻辑/可信度三类诉求配置均衡而有层次", "有诉求组合但层次感不足", "诉求单一或堆砌", "缺乏有效说服结构"] },
    { nameZh: "异议处理", nameEn: "Objection Handling", weight: 20, bands: ["主动预判并化解主要异议", "回应部分异议", "回避明显异议", "无视相反观点"] },
    { nameZh: "行动号召", nameEn: "Call to Action", weight: 15, bands: ["具体可行、低阻力的行动号召", "号召明确但略显笼统", "号召薄弱或缺失", "无行动号召"] },
    { nameZh: "语言与语域", nameEn: "Language & Register", weight: 10, bands: ["语言有力而克制，语域切合", "语言有效，偶有失准", "语气生硬或夸张", "语言削弱说服力"] },
  ]),
  report: rub([
    { nameZh: "信息准确完整", nameEn: "Accuracy & Completeness", weight: 30, bands: ["事实准确、信息全面且区分已知与推断", "信息基本准确，个别遗漏", "有事实错误或遗漏", "多处失真或关键信息缺失"] },
    { nameZh: "结构规范", nameEn: "Structure & Formatting", weight: 20, bands: ["标准报告结构（背景/方法/结果/建议）完整", "结构基本齐全", "结构要素缺失", "结构混乱"] },
    { nameZh: "客观中立", nameEn: "Neutrality & Objectivity", weight: 25, bands: ["立场中立、措辞审慎、来源清楚", "总体中立，偶有主观词", "明显立场倾向", "夹带评判"] },
    { nameZh: "数据呈现", nameEn: "Data Presentation", weight: 15, bands: ["数字与图表转述准确、口径注明", "数据基本准确，口径略有模糊", "数据引用不规范", "数据缺失或误读"] },
    { nameZh: "语言与语域", nameEn: "Language & Register", weight: 10, bands: ["语法准确、语域切合正式报告", "少量错误，语域总体得当", "错误较多", "错误密集"] },
  ]),
  summary: rub([
    { nameZh: "忠于原文", nameEn: "Fidelity to Source", weight: 30, bands: ["完整覆盖核心信息且无自造内容", "覆盖主要信息，个别次要遗漏", "遗漏关键信息或添加推断", "严重偏离原意"] },
    { nameZh: "篇幅压缩", nameEn: "Compression", weight: 25, bands: ["在字限内高效保留信息密度", "基本在限内，略松或略紧", "明显超限或过度删减", "不满足字数要求"] },
    { nameZh: "中立改写", nameEn: "Neutral Paraphrase", weight: 25, bands: ["用自己语言中性转述，不逐字照抄", "大体改写，少量照搬", "改写不足或带立场词", "大段照抄或明显偏颇"] },
    { nameZh: "结构组织", nameEn: "Structure", weight: 10, bands: ["信息按逻辑组织、层次清楚", "组织基本合理", "信息堆砌", "杂乱无序"] },
    { nameZh: "语言准确", nameEn: "Language Accuracy", weight: 10, bands: ["语法准确、措辞精当", "少量错误", "错误较多", "错误密集"] },
  ]),
};

const TASK_SEEDS: Array<[EssayGenre, string, [number, number], string]> = [
  // ---- argumentative (30) ----
  ["argumentative", "Should social media platforms be legally liable for algorithmic amplification of harmful content? Take a position.", [350, 450], "claim→evidence→counterargument→conclusion"],
  ["argumentative", "Do standardized tests measure merit or family income? Argue with at least two sources.", [350, 450], "数据引用格式与让步段"],
  ["argumentative", "Is remote work a net gain for early-career employees?", [300, 400], "定义'net gain'后立论"],
  ["argumentative", "Should the voting age be lowered to 16?", [350, 450], "预判并反驳最强反方"],
  ["argumentative", "Are elite universities engines of mobility or gatekeeping?", [400, 500], "因果链完整性"],
  ["argumentative", "Should AI-generated art receive copyright protection?", [350, 450], "法律+创作双重论证"],
  ["argumentative", "Is a four-day work week compatible with economic growth?", [350, 450], "实证数据引用规范"],
  ["argumentative", "Should cities ban private cars from downtown cores entirely?", [350, 450], "代价-收益权衡结构"],
  ["argumentative", "Does social media do more to inform or to polarize the public?", [350, 450], "两面证据的对称呈现"],
  ["argumentative", "Should professional athletes be treated as role models by the media?", [300, 400], "概念界定先行"],
  ["argumentative", "Is nuclear power indispensable to decarbonization?", [400, 500], "风险量化对比"],
  ["argumentative", "Should gig workers be classified as employees?", [350, 450], "法律标准与经济现实张力"],
  ["argumentative", "Is cultural appropriation always harmful?", [400, 500], "例证选择的文化敏感度"],
  ["argumentative", "Should public libraries replace fines with community service?", [300, 400], "政策论证的成本核算"],
  ["argumentative", "Does automation threaten or augment professional judgment?", [400, 500], "区分任务与职业的分析框架"],
  ["argumentative", "Should the U.S. adopt compulsory voting?", [350, 450], "比较政治案例（澳/比）"],
  ["argumentative", "Is 'grit' a useful educational concept or a myth?", [400, 500], "学术文献对话感"],
  ["argumentative", "Should fast fashion be taxed per garment for its carbon cost?", [350, 450], "外部性内部化论证"],
  ["argumentative", "Are whistleblower protections strong enough?", [350, 450], "公共利益与保密义务的平衡"],
  ["argumentative", "Should universities eliminate legacy admissions?", [350, 450], "公平原则的一致性检验"],
  ["argumentative", "Is space exploration spending justified while poverty persists?", [400, 500], "机会成本分析"],
  ["argumentative", "Should employers be allowed to require vaccination?", [350, 450], "人身自主与公共健康边界"],
  ["argumentative", "Do term limits strengthen or weaken democratic institutions?", [400, 500], "制度设计的二阶效应"],
  ["argumentative", "Should cash remain legal tender forever?", [350, 450], "弱势群体影响的专门段落"],
  ["argumentative", "Is 'cancel culture' accountability or mob justice?", [400, 500], "概念操作化难度示范"],
  ["argumentative", "Should high schools teach media literacy as a required course?", [350, 450], "课程可行性论证"],
  ["argumentative", "Are electric vehicles genuinely greener over their lifecycle?", [400, 500], "全生命周期数据引用"],
  ["argumentative", "Should the U.S. Senate filibuster be abolished?", [350, 450], "制度史与功能主义双线"],
  ["argumentative", "Is entrepreneurship teachable, or is it innate?", [400, 500], "可证伪性表述练习"],
  ["argumentative", "Should platforms allow anonymous political speech?", [400, 500], "匿名价值与滥用成本的权衡"],

  // ---- analytical (25) ----
  ["analytical", "Analyze how one brand builds customer loyalty through design rather than advertising.", [400, 500], "案例分析结构：现象-机制-效果"],
  ["analytical", "Examine why some cities gentrify faster than others.", [450, 550], "变量控制意识"],
  ["analytical", "Compare two countries' responses to the same pandemic challenge.", [450, 550], "可比性前提说明"],
  ["analytical", "Break down the economics of a streaming subscription service.", [400, 500], "单位经济模型拆解"],
  ["analytical", "Analyze a failed product launch using a known framework.", [400, 500], "理论工具的正确套用"],
  ["analytical", "Why do some public health messages backfire? Analyze with psychology concepts.", [400, 500], "心理机制引用规范"],
  ["analytical", "Deconstruct the rhetoric of a famous speech you admire.", [450, 550], "ethos/pathos/logos 三分法"],
  ["analytical", "Analyze the causes of declining trust in institutions.", [450, 550], "多因排序与权重讨论"],
  ["analytical", "How do recommendation algorithms shape taste? Trace one mechanism end-to-end.", [400, 500], "机制链条完整呈现"],
  ["analytical", "Examine the trade-offs in a city's decision to build or not build a stadium.", [450, 550], "财政影响测算思路"],
  ["analytical", "Analyze why inflation expectations matter more than inflation itself.", [400, 500], "预期传导路径解释"],
  ["analytical", "Compare the onboarding experience of two competing apps.", [400, 500], "用户旅程分镜写法"],
  ["analytical", "What explains the global rise of remote work after 2020?", [450, 550], "趋势归因的多层证据"],
  ["analytical", "Analyze a supply-chain bottleneck from recent years end to end.", [450, 550], "瓶颈识别方法论"],
  ["analytical", "Why did a once-dominant company miss a platform shift? Choose and dissect.", [450, 550], "颠覆式创新理论应用"],
  ["analytical", "Examine how grading systems shape student behavior.", [400, 500], "激励扭曲实例化"],
  ["analytical", "Analyze the economics of college textbook pricing.", [400, 500], "市场结构分析（买方垄断）"],
  ["analytical", "Trace how a slang word enters mainstream vocabulary.", [400, 500], "语言演变证据链"],
  ["analytical", "Analyze the strategic use of silence in negotiation.", [400, 500], "非语言要素学术化"],
  ["analytical", "What makes misinformation sticky? Apply memory research.", [450, 550], "情绪性与重复性的实证引用"],
  ["analytical", "Dissect a viral ad campaign's persuasion architecture.", [400, 500], "说服技术逐帧拆解"],
  ["analytical", "Analyze the housing affordability crisis in one metro area.", [450, 550], "供需两侧分解"],
  ["analytical", "Why do open-source projects succeed or stall? Identify factors.", [400, 500], "社区治理维度引入"],
  ["analytical", "Examine the side effects of productivity software on knowledge work.", [400, 500], "测量悖论讨论"],
  ["analytical", "Analyze a historical decision through both utilitarian and deontological lenses.", [450, 550], "双伦理框架对照"],

  // ---- persuasive (20) ----
  ["persuasive", "Persuade your city council to fund protected bike lanes downtown.", [350, 450], "受众利益优先排序"],
  ["persuasive", "Convince a friend to start a weekly English study group with you.", [300, 400], "互惠诉求设计"],
  ["persuasive", "Argue your school should adopt pass/fail options for electives.", [350, 450], "低阻力改革方案包装"],
  ["persuasive", "Persuade investors that your small idea deserves seed funding.", [400, 500], "电梯陈述扩展为提案"],
  ["persuasive", "Convince readers to reduce single-use plastics without guilt-tripping.", [350, 450], "正向框架替代恐吓"],
  ["persuasive", "Persuade your manager to pilot a four-day schedule for one quarter.", [400, 500], "试点的风险控制条款"],
  ["persuasive", "Make the case that volunteering improves career prospects.", [350, 450], "软技能的证据化表达"],
  ["persuasive", "Convince a skeptical parent that coding camps are worth it.", [350, 450], "成本收益具体化"],
  ["persuasive", "Argue for later school start times citing adolescent sleep research.", [400, 500], "科研结论转译为建议"],
  ["persuasive", "Persuade commuters to try public transit twice a week.", [350, 450], "行为改变最小启动单元"],
  ["persuasive", "Make the case for a four-day library week in summer.", [350, 450], "公共服务预算论证"],
  ["persuasive", "Convince a landlord to allow pets with reasonable conditions.", [350, 450], "风险缓解承诺书式写法"],
  ["persuasive", "Argue that every student should learn basic statistics.", [400, 500], "统计素养的现实案例"],
  ["persuasive", "Persuade your team to switch meeting notes to a shared doc.", [300, 400], "协作工具迁移提案"],
  ["persuasive", "Make the case that local news deserves subscriptions.", [350, 450], "公共品论证"],
  ["persuasive", "Convince your city to plant more native trees downtown.", [350, 450], "生态收益的货币化表达"],
  ["persuasive", "Argue that internships should always be paid.", [400, 500], "公平与质量双赢论证"],
  ["persuasive", "Persuade gamers to support right-to-repair laws.", [350, 450], "圈层语言的破圈转译"],
  ["persuasive", "Convince a restaurant owner to publish calorie counts voluntarily.", [350, 450], "先发优势叙事"],
  ["persuasive", "Make the case that failure portfolios belong on résumés.", [350, 450], "反直觉主张的说服策略"],

  // ---- report (12) ----
  ["report", "Report on your city's recycling rules for a newcomer audience.", [300, 400], "程序性写作：步骤编号与例外说明"],
  ["report", "Summarize this quarter's key economic indicators for non-specialists.", [350, 450], "指标白话转译能力"],
  ["report", "Write an incident report for a (real or imagined) service outage.", [300, 400], "时间线+影响+已采取措施三段式"],
  ["report", "Describe survey findings about commute habits among classmates.", [350, 450], "样本描述与方法局限声明"],
  ["report", "Report the results of a two-week personal habit experiment.", [300, 400], "自我实验的客观记录口吻"],
  ["report", "Compile a status report on one renewable-energy project in your region.", [400, 500], "进度/风险/下一步三栏结构"],
  ["report", "Document the onboarding process at a job you know well.", [350, 450], "流程文档的可执行标准"],
  ["report", "Report usage statistics for a free app you use daily.", [350, 450], "数据可视化描述规范"],
  ["report", "Write a comparison report on two local hospitals' public ratings.", [400, 500], "评分口径差异的方法注记"],
  ["report", "Summarize community feedback from a public meeting you attended (or watched).", [350, 450], "多方立场的中立转述"],
  ["report", "Report on supply delays affecting one consumer product category.", [350, 450], "因果推断的谨慎措辞"],
  ["report", "Draft a quarterly OKR progress report for a two-person team.", [300, 400], "目标-关键结果对齐写法"],

  // ---- summary (13) ----
  ["summary", "Summarize a 20-minute podcast episode in 150 words.", [140, 160], "比例压缩与信息密度"],
  ["summary", "Condense a long news article into exactly three sentences.", [60, 80], "主谓宾骨架提取"],
  ["summary", "Summarize a film's plot without spoiling the ending.", [120, 150], "信息分级与悬念保留"],
  ["summary", "Reduce a 500-word op-ed to a 100-word neutral digest.", [90, 110], "去除立场词的中立改写"],
  ["summary", "Summarize your last month of learning data for a mentor.", [130, 160], "数据叙事的时间轴组织"],
  ["summary", "Boil down a technical README for a non-engineer colleague.", [120, 150], "术语降维不降真"],
  ["summary", "Summarize two opposing op-eds in a single balanced paragraph.", [120, 150], "对称篇幅的公平原则"],
  ["summary", "Give a 100-word executive summary of any book chapter.", [90, 115], "章节论点地图化"],
  ["summary", "Summarize a lecture recording's key claims and evidence types.", [130, 160], "论断-证据配对标注"],
  ["summary", "Condense a recipe video into written steps for a beginner.", [100, 130], "程序性知识的文字重建"],
  ["summary", "Summarize a product review into pros/cons/caveats bullets.", [100, 130], "要点级压缩而非句子拼接"],
  ["summary", "Summarize one week of world headlines in five sentences.", [90, 120], "重要性排序训练"],
  ["summary", "Summarize a research paper's abstract into plain language.", [110, 140], "学术黑话白话化"],
];

export const WRITING_TASKS: readonly WritingTask[] = TASK_SEEDS.map(
  ([genre, promptEn, targetWords, focusZh], i) => ({
    id: `writing-${i + 1}`,
    number: i + 1,
    genre,
    promptEn,
    targetWords,
    focusZh,
    rubric: RUBRICS_BY_GENRE[genre],
  }),
);

export function getWritingTasksByGenre(genre: EssayGenre): WritingTask[] {
  return WRITING_TASKS.filter((task) => task.genre === genre);
}
