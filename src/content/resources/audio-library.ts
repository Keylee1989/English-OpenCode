/**
 * Phase 15-D / 17-C: Advanced Listening Library (external resources).
 * Base set (20) from Phase 15-D + expansion (30) from Phase 17-C = 50 total.
 */
import type { ResourceLevel } from "@/content/resources/reading-library";
import { ADDITIONAL_AUDIO } from "@/content/resources/audio-library-expansion";
import { LISTENING_UPGRADES } from "@/content/resources/audio-library-p19";

export interface ListeningResource {
  id: string;
  number: number;
  title: string;
  source: string;
  url: string;
  level: Extract<ResourceLevel, "B2" | "C1" | "C2">;
  typicalMinutes: number;
  categoryZh: string;
  transcriptHintZh: string;
  keyVocabulary: string[];
  shadowingTaskZh: string;
  comprehensionPrompts: string[];
  transcriptNoteZh: string;
  dictationTaskZh: string;
  summaryTaskZh: string;
}

/** ListeningResource without the Phase 19 upgrade fields (filled via LISTENING_UPGRADES). */
export type ListeningResourceBase = Omit<
  ListeningResource,
  "transcriptNoteZh" | "dictationTaskZh" | "summaryTaskZh"
>;

const BASE_LISTENING_RESOURCES: readonly ListeningResourceBase[] = [
  { id: "listen-01-news-analysis", number: 1, title: "Up First — daily news analysis", source: "NPR", url: "https://www.npr.org/podcasts/510318/up-first", level: "C1", typicalMinutes: 13, categoryZh: "新闻分析", transcriptHintZh: "NPR 页面提供完整文字稿（Transcript 按钮）。", keyVocabulary: ["briefing", "on the ground", "fallout"], shadowingTaskZh: "选一条新闻的前 60 秒做影子跟读，重点模仿语调起伏。", comprehensionPrompts: ["用两句话概括头条事件及其利害关系。", "记者引用了哪一方的说法？是否给了回应方机会？"] },
  { id: "listen-02-podcast-interview", number: 2, title: "Fresh Air — long-form interviews", source: "NPR / WHYY", url: "https://www.npr.org/programs/fresh-air/", level: "C1", typicalMinutes: 45, categoryZh: "播客访谈", transcriptHintZh: "官网多数访谈附文字稿。", keyVocabulary: ["draw on", "push back", "by and large"], shadowingTaskZh: "挑受访者最流畅的 30 秒，复述其观点而非逐词模仿。", comprehensionPrompts: ["受访者的核心论点是什么？", "主持人如何追问？列出两个追问句式。"] },
  { id: "listen-03-academic-lecture", number: 3, title: "Open Yale Courses — Introduction to Psychology", source: "Yale University", url: "https://oyc.yale.edu/psychology/psyc-110", level: "C1", typicalMinutes: 60, categoryZh: "学术讲座", transcriptHintZh: "每讲提供 PDF 文字稿下载。", keyVocabulary: ["hypothesis", "empirical", "correlation vs causation"], shadowingTaskZh: "跟读定义句与转折句（However / That said...），注意重读。", comprehensionPrompts: ["本讲提出的核心研究方法是什么？", "教授用什么例子反驳常识？"] },
  { id: "listen-04-business-meeting", number: 4, title: "Business English Pod — meetings series", source: "Business English Pod", url: "https://www.businessenglishpod.com/category/meetings/", level: "B2", typicalMinutes: 20, categoryZh: "商务会议", transcriptHintZh: "每集附对话原文与短语讲解。", keyVocabulary: ["circle back", "action item", "touch base"], shadowingTaskZh: "模仿'委婉反对'的三个句式并录音对比。", comprehensionPrompts: ["会议如何分配后续任务？", "哪位与会者表达了保留意见？用什么措辞？"] },
  { id: "listen-05-debate-format", number: 5, title: "Intelligence Squared US — Oxford-style debates", source: "Intelligence Squared US", url: "https://www.intelligencesquaredus.org/", level: "C2", typicalMinutes: 90, categoryZh: "辩论", transcriptHintZh: "官网附完整辩词记录。", keyVocabulary: ["the resolution", "rebuttal", "concede the point"], shadowingTaskZh: "选一段 rebuttal 跟读，标注逻辑连接词。", comprehensionPrompts: ["正反方各举了什么证据类型？", "哪位辩手做了让步？让步后如何反转？"] },
  { id: "listen-06-documentary-narration", number: 6, title: "Radiolab — narrative science documentary", source: "WNYC", url: "https://radiolab.org/", level: "C1", typicalMinutes: 50, categoryZh: "纪录片叙事", transcriptHintZh: "部分单集提供文字稿。", keyVocabulary: ["a team of", "it turns out", "at stake"], shadowingTaskZh: "模仿旁白的节奏：短句制造悬念，长句铺陈背景。", comprehensionPrompts: ["故事的科学转折点在哪里？", "旁白如何使用声音设计引导情绪？"] },
  { id: "listen-07-storytelling-show", number: 7, title: "The Moth — true stories told live", source: "The Moth", url: "https://themoth.org/podcast", level: "C1", typicalMinutes: 15, categoryZh: "现场讲故事", transcriptHintZh: "官网无官方文字稿——训练裸听与复述。", keyVocabulary: ["grew up", "long story short", "to this day"], shadowingTaskZh: "听两遍后用自己的话复述故事骨架（起因-冲突-结局）。", comprehensionPrompts: ["故事的转折点是什么？", "讲述者的语气如何配合笑点？"] },
  { id: "listen-08-science-talk", number: 8, title: "Science Friday — weekly science talk", source: "NPR / WNYC", url: "https://www.sciencefriday.com/", level: "C1", typicalMinutes: 25, categoryZh: "科学谈话", transcriptHintZh: "官网提供分段文字稿。", keyVocabulary: ["peer-reviewed", "breakthrough", "caveat"], shadowingTaskZh: "跟读科学家解释因果的句子，注意 hedging 用法。", comprehensionPrompts: ["研究结论被加上了哪些限制条件？", "主持人的哪个问题推动了澄清？"] },
  { id: "listen-09-history-lecture-series", number: 9, title: "Open Yale Courses — American History since 1865", source: "Yale University", url: "https://oyc.yale.edu/history/hist-119", level: "C1", typicalMinutes: 75, categoryZh: "历史讲座", transcriptHintZh: "全讲文字稿可下载。", keyVocabulary: ["reconstruction", "legislation", "aftermath"], shadowingTaskZh: "跟读因果论证段落，抄写两个复杂句并分析结构。", comprehensionPrompts: ["讲座如何组织年代脉络？", "哪些证据支撑核心论点？"] },
  { id: "listen-10-psychology-lecture", number: 10, title: "Hidden Brain — behavior science podcast", source: "Hidden Brain Media", url: "https://hiddenbrain.org/", level: "C1", typicalMinutes: 50, categoryZh: "心理学讲座", transcriptHintZh: "官网多数单集有文字稿。", keyVocabulary: ["counterintuitive", "a host of", "nudge"], shadowingTaskZh: "跟读实验描述段，练习数字与研究设计的读法。", comprehensionPrompts: ["实验的自变量与因变量是什么？", "结论被推广到什么场景？边界在哪？"] },
  { id: "listen-11-marketplace-economics", number: 11, title: "Marketplace — business & economy news", source: "American Public Media", url: "https://www.marketplace.org/shows/marketplace/", level: "C1", typicalMinutes: 30, categoryZh: "经济新闻", transcriptHintZh: "每条报道附文字稿。", keyVocabulary: ["earnings report", "consumer sentiment", "yield curve"], shadowingTaskZh: "跟读数据播报句，练习百分比与小数读法。", comprehensionPrompts: ["本期最重要的经济信号是什么？", "报道如何平衡正反两面数据？"] },
  { id: "listen-12-the-daily-nyt", number: 12, title: "The Daily — New York Times deep dive", source: "The New York Times", url: "https://www.nytimes.com/column/the-daily", level: "C1", typicalMinutes: 30, categoryZh: "深度新闻", transcriptHintZh: "节目页附文字稿链接。", keyVocabulary: ["according to", "in the wake of", "backlash"], shadowingTaskZh: "选记者叙述段做跟读，注意插入语的语调下降。", comprehensionPrompts: ["报道的时间线如何展开？", "结尾留了什么未解问题？"] },
  { id: "listen-13-code-switch-culture", number: 13, title: "Code Switch — race & culture conversations", source: "NPR", url: "https://www.npr.org/podcasts/codeswitch", level: "C2", typicalMinutes: 35, categoryZh: "文化讨论", transcriptHintZh: "官网提供文字稿。", keyVocabulary: ["code-switching", "lived experience", "the default"], shadowingTaskZh: "跟读观点交锋段，体会礼貌打断的技巧。", comprehensionPrompts: ["嘉宾的个人经历如何支撑论点？", "讨论中出现了哪些术语需要查证？"] },
  { id: "listen-14-ted-radio-hour", number: 14, title: "TED Radio Hour — themed talk compilations", source: "NPR / TED", url: "https://www.npr.org/programs/ted-radio-hour/", level: "C1", typicalMinutes: 55, categoryZh: "主题演讲合集", transcriptHintZh: "官网附节选与原讲链接。", keyVocabulary: ["reframe", "at its core", "a case in point"], shadowingTaskZh: "跟读演讲者开场 45 秒，分析三种抓注意力手法。", comprehensionPrompts: ["同一主题下不同讲者观点有何分歧？", "哪个例子最有说服力？为什么？"] },
  { id: "listen-15-this-american-life", number: 15, title: "This American Life — themed narrative episodes", source: "WBEZ Chicago", url: "https://www.thisamericanlife.org/", level: "C2", typicalMinutes: 60, categoryZh: "纪实叙事", transcriptHintZh: "全部单集提供完整文字稿（付费档免费档均有）。", keyVocabulary: ["act one", "meanwhile", "as it happens"], shadowingTaskZh: "跟读 act 过渡句，学习三幕式口语结构标记。", comprehensionPrompts: ["三幕各自推进了什么主题？", "哪个次要人物改变了主线理解？"] },
  { id: "listen-16-legal-commentary", number: 16, title: "Court Junkie — courtroom case narratives", source: "Court Junkie Podcast", url: "https://www.courtjunkie.com/", level: "C2", typicalMinutes: 40, categoryZh: "法律案例叙事", transcriptHintZh: "付费会员附文字稿；可先裸听。", keyVocabulary: ["indictment", "plead guilty", "sentencing hearing"], shadowingTaskZh: "跟读检方陈述段，积累法庭程序词汇十组。", comprehensionPrompts: ["控辩双方对同一事实的表述差异在哪？", "判决援引了什么标准？"] },
  { id: "listen-17-tech-industry-analysis", number: 17, title: "Land of the Giants — tech industry season deep-dives", source: "The Verge / Vox", url: "https://www.theverge.com/land-of-the-giants-podcast", level: "C1", typicalMinutes: 40, categoryZh: "科技行业分析", transcriptHintZh: "Vox 部分单集提供文字稿。", keyVocabulary: ["market share", "ecosystem lock-in", "regulatory scrutiny"], shadowingTaskZh: "跟读行业预测句，收集五个模糊限制语。", comprehensionPrompts: ["该平台如何建立护城河？", "分析师对监管的态度是乐观还是悲观？"] },
  { id: "listen-18-health-policy-briefing", number: 18, title: "KFF Health Policy Briefings — What the Health?", source: "KFF", url: "https://kffhealthnews.org/newsletters/podcasts/", level: "C2", typicalMinutes: 25, categoryZh: "健康政策", transcriptHintZh: "KFF 提供节目页面摘要与相关报告链接。", keyVocabulary: ["coverage expansion", "out-of-pocket cap", "rulemaking"], shadowingTaskZh: "跟读政策变化句，练习被动语态密集段的停顿。", comprehensionPrompts: ["新规影响哪类人群最多？", "各方利益相关者的立场分别是什么？"] },
  { id: "listen-19-climate-reporting", number: 19, title: "How to Save a Planet — climate solutions journalism", source: "Gimlet / Spotify", url: "https://gimletmedia.com/shows/howtosaveaplanet", level: "C1", typicalMinutes: 45, categoryZh: "气候报道", transcriptHintZh: "Spotify 内显示自动转写；关键句手动精听。", keyVocabulary: ["decarbonize", "bottleneck", "scalable"], shadowingTaskZh: "跟读解决方案描述段，练习乐观语气的克制表达。", comprehensionPrompts: ["该方案的最大阻力来自哪里？", "记者如何避免空洞乐观？"] },
  { id: "listen-20-native-conversation-speed", number: 20, title: "SmartLess — unscripted native-speed conversation", source: "SmartLess / Wondery", url: "https://www.wondery.com/shows/smartless/", level: "C2", typicalMinutes: 55, categoryZh: "母语速闲聊", transcriptHintZh: "Wondery 附转写（订阅）。先裸听再对照。", keyVocabulary: ["no kidding", "off the cuff", "double down"], shadowingTaskZh: "挑战 15 秒母语速跟读三遍，录音自评流利度。", comprehensionPrompts: ["三位主持人如何接力抛梗？", "哪处你完全没听懂？回听定位原因（连读/俚语/文化梗）。"] },
];

export const LISTENING_RESOURCES: readonly ListeningResource[] = [
  ...BASE_LISTENING_RESOURCES,
  ...(ADDITIONAL_AUDIO as readonly ListeningResourceBase[]),
].map((r) => {
  const up = LISTENING_UPGRADES[r.id];
  if (!up) {
    throw new Error(`Missing listening upgrade metadata for resource: ${r.id}`);
  }
  return {
    ...r,
    transcriptNoteZh: up.transcriptNoteZh,
    dictationTaskZh: up.dictationTaskZh,
    summaryTaskZh: up.summaryTaskZh,
  };
});
