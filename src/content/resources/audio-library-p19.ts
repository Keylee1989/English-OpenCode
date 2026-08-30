/**
 * Phase 19 P1: Listening upgrade metadata.
 * Adds transcript note, dictation task, and summary task for each of the
 * 50 listening resources. Keyed by resource id and merged into
 * LISTENING_RESOURCES in audio-library.ts.
 */
export interface ListeningUpgrade {
  transcriptNoteZh: string;
  dictationTaskZh: string;
  summaryTaskZh: string;
}

export const LISTENING_UPGRADES: Readonly<Record<string, ListeningUpgrade>> = {
  "listen-01-news-analysis": {
    transcriptNoteZh: "NPR 页面 Transcript 按钮提供逐字稿；先听力盲听记笔记，再对照文字稿修正拼写与连读。",
    dictationTaskZh: "选头条前 5 句做整段听写，重点核对数字、机构名与人名的首字母大写。",
    summaryTaskZh: "用 80 词概括：演进主线 + 双方立场 + 记者隐含态度，并写出一句可证伪的预测。",
  },
  "listen-02-podcast-interview": {
    transcriptNoteZh: "官网多数访谈附文字稿；音频较长时可分段（每 10 分钟）精听。",
    dictationTaskZh: "听写受访者最精彩的 6 句，标出所有名词化结构与动词短语。",
    summaryTaskZh: "用 90 词总结受访者的核心论证链：主张 → 证据 → 例证，并复述主持人两个追问手法。",
  },
  "listen-03-academic-lecture": {
    transcriptNoteZh: "每讲附 PDF 文字稿；先听框架（导言-论点-结论）再精听细节。",
    dictationTaskZh: "听写本讲开头对'某一概念'的定义句，核对定语从句与学术连接词。",
    summaryTaskZh: "用 100 词整理本讲提纲：研究问题、方法、结论、遗留问题各一句。",
  },
  "listen-04-business-meeting": {
    transcriptNoteZh: "每集附对话原文与短语讲解；先裸听判断会谈轮次，再对照原文。",
    dictationTaskZh: "听写会议收尾 5 句（分配 action item 的部分），练习将来时与命令式口语。",
    summaryTaskZh: "用 70 词复述：议题、各方立场、最终 action items 及负责人（用被动语态）。",
  },
  "listen-05-debate-format": {
    transcriptNoteZh: "官网附完整辩词；先听观点再对照，标注让步与反驳的逻辑连接词。",
    dictationTaskZh: "听写反方一段 rebuttal（6 句），标出黄灯词（however/that said/yet）。",
    summaryTaskZh: "用 110 词分别概括正反方最强论据，并写明哪一方做了决定性命中的让步。",
  },
  "listen-06-documentary-narration": {
    transcriptNoteZh: "部分单集提供文字稿；叙事型音频重点听节奏与前因后果。",
    dictationTaskZh: "听写旁白制造悬念的三句（短句），体会停顿与重读的位置。",
    summaryTaskZh: "用 80 词重述故事的科学主线与转折点，并说明声音设计如何服务叙事。",
  },
  "listen-07-storytelling-show": {
    transcriptNoteZh: "无官方文字稿——训练裸听；听后自查生词与连读。",
    dictationTaskZh: "裸听两遍后用笔记还原故事骨架，再回听补全细节（只听结尾 3 句做听写）。",
    summaryTaskZh: "用 75 词复述起-冲-合结构，找出讲述者最打动人的一个语气转折并说明。",
  },
  "listen-08-science-talk": {
    transcriptNoteZh: "官网提供分段文字稿；先听主持人提问，再精听科学家解释。",
    dictationTaskZh: "听写科学家用 hedging 的一句结论（如 may/appear/suggest），核对被动语态。",
    summaryTaskZh: "用 85 词概括结论 + 限制条件，并写出一句比原结论更审慎的改写。",
  },
  "listen-09-history-lecture-series": {
    transcriptNoteZh: "全讲文字稿可下载；先听年代划分，再精听因果论证。",
    dictationTaskZh: "听写讲座中一个复杂因果句（含 because/led to），抄写并拆解成分。",
    summaryTaskZh: "用 100 词画出年代-事件-后果的时间轴，概括核心论点及两条证据。",
  },
  "listen-10-psychology-lecture": {
    transcriptNoteZh: "多数单集有文字稿；实验描述段建议反复精听（含数字与流程）。",
    dictationTaskZh: "听写实验设计段（自变量/因变量/样本量），核对研究术语与数字读法。",
    summaryTaskZh: "用 90 词描述实验：假设、设计、结果、推广边界，并说明哪些结论被限制。",
  },
  "listen-11-marketplace-economics": {
    transcriptNoteZh: "每条报道附文字稿；先裸听数据再对照核读百分比。",
    dictationTaskZh: "听写数据播报 4 句，特别核对百分比、增长率、小数与年份读法。",
    summaryTaskZh: "用 80 词概括本期最重要经济信号、正反两面数据与报道立场。",
  },
  "listen-12-the-daily-nyt": {
    transcriptNoteZh: "节目页附文字稿链接；先听时间线再对照细节。",
    dictationTaskZh: "听写记者叙述段 5 句，标出所有插入语与从句的分割位置。",
    summaryTaskZh: "用 90 词复述报道时间线、各方说法及结尾留下的未解问题。",
  },
  "listen-13-code-switch-culture": {
    transcriptNoteZh: "官网提供文字稿；文化讨论先听观点交锋再对照。",
    dictationTaskZh: "听写一段礼貌打断的对话（4 句），注意道歉式开场与追问。",
    summaryTaskZh: "用 85 词总结嘉宾的核心论点，说明个人经历如何支撑观点，并列出需查证的术语。",
  },
  "listen-14-ted-radio-hour": {
    transcriptNoteZh: "官网附节选与原讲链接；先听主题如何被多角度拆解。",
    dictationTaskZh: "听写演讲者开场 45 秒，分析三种抓注意力手法（提问/对比/个人故事）。",
    summaryTaskZh: "用 100 词对比同一主题下不同讲者的观点分歧，选出最有说服力的例子并说明。",
  },
  "listen-15-this-american-life": {
    transcriptNoteZh: "全部单集提供完整文字稿；建议先裸听三幕再对照。",
    dictationTaskZh: "听写三幕之间的过渡句，学习动作结构标记（act one / meanwhile）。",
    summaryTaskZh: "用 110 词梳理三幕主题、次要人物如何改变主线理解，并评价叙事密度。",
  },
  "listen-16-legal-commentary": {
    transcriptNoteZh: "付费会员附文字稿；可先裸听积累法庭程序词汇。",
    dictationTaskZh: "听写检方陈述段 5 句，核对法律术语（indictment/plea/hearing）。",
    summaryTaskZh: "用 95 词对比控辩对同一事实的表述差异，写明判决援引的标准。",
  },
  "listen-17-tech-industry-analysis": {
    transcriptNoteZh: "部分单集提供文字稿；行业分析听护城河论证。",
    dictationTaskZh: "听写预测句 4 句，收集 5 个模糊限制语（likely/may/arguably）。",
    summaryTaskZh: "用 90 词概括平台如何建立护城河、竞争威胁及分析师的监管态度。",
  },
  "listen-18-health-policy-briefing": {
    transcriptNoteZh: "提供摘要与相关报告链接；政策段先听变化再对照。",
    dictationTaskZh: "听写一个新规变化的句子，练习被动语态与政策术语的停顿。",
    summaryTaskZh: "用 95 词说明新规受影响人群、各方立场及规则的潜在权衡。",
  },
  "listen-19-climate-reporting": {
    transcriptNoteZh: "Spotify 显示自动转写；关键句手动精听。",
    dictationTaskZh: "听写解决方案描述段 5 句，核对让步与乐观语气的克制表达。",
    summaryTaskZh: "用 85 词概括方案、最大阻力及记者避免空洞乐观的手法。",
  },
  "listen-20-native-conversation-speed": {
    transcriptNoteZh: "Wondery 附转写（订阅）；先裸听再对照。",
    dictationTaskZh: "挑战听写 15 秒母语速对话，标注连读、缩略与俚语。",
    summaryTaskZh: "用 70 词复述三人接力抛梗的结构，并定位自己最没听懂的 2 处及其原因。",
  },

  "listen-21-ted-audio-daily": {
    transcriptNoteZh: "TED 官网附完整文字稿；先听论点框架再对照细节。",
    dictationTaskZh: "听写开场 45 秒（抓注意力段），核对排比与短句节奏。",
    summaryTaskZh: "用 75 词概括讲者核心论点、所用案例及结尾的呼吁行动。",
  },
  "listen-22-ezra-klein-show": {
    transcriptNoteZh: "NYT 页面附文字稿；政策深访听因果论证链。",
    dictationTaskZh: "听写嘉宾提出改革建议的 5 句，标出因果与让步连接词。",
    summaryTaskZh: "用 100 词复述嘉宾核心改革建议、政策机制及主持人提出的反例。",
  },
  "listen-23-planet-money": {
    transcriptNoteZh: "NPR 附文字稿；经济故事听概念如何被类比化。",
    dictationTaskZh: "听写经济学家解释概念的 4 句（含数字），练习读法与单位。",
    summaryTaskZh: "用 80 词概括本期经济学概念、日常类比及数据支撑。",
  },
  "listen-24-freakonomics-radio": {
    transcriptNoteZh: "官网附文字稿；数据分析听相关性与混杂变量。",
    dictationTaskZh: "听写因果表述 4 句，核对 correlation vs causation 的措辞。",
    summaryTaskZh: "用 85 词概括意外关联、作者排除混淆变量的方法及结论边界。",
  },
  "listen-25-hardfork-nyt": {
    transcriptNoteZh: "NYT 附文字稿；AI 新闻听'新模型改变了什么'。",
    dictationTaskZh: "听写技术预测 4 句，收集 5 个 hedging 表达并标注。",
    summaryTaskZh: "用 90 词概括本周 AI 要闻、技术影响及主持人的监管态度。",
  },
  "listen-26-stanford-gsb-podcast": {
    transcriptNoteZh: "部分附文字稿；商学院讲座听框架与案例。",
    dictationTaskZh: "听写教授定义管理框架的 3 句，核对术语与案例衔接。",
    summaryTaskZh: "用 85 词概括核心管理框架、两个公司案例及适用边界。",
  },
  "listen-27-mit-open-courseware": {
    transcriptNoteZh: "OCW 提供完整文字稿与笔记；算法讲解建议回放精听。",
    dictationTaskZh: "听写算法解释段 5 句，核对技术术语与步骤连接词。",
    summaryTaskZh: "用 95 词概括本讲计算模型、可视化辅助方法及核心思想。",
  },
  "listen-28-yale-climate-lecture": {
    transcriptNoteZh: "文章页附音频链接；气候科学听机制与政策含义。",
    dictationTaskZh: "听写气候机制解释段 4 句，核对专业术语发音与被动句。",
    summaryTaskZh: "用 80 词概括最新研究如何改变认知及其政策含义。",
  },
  "listen-29-bbc-in-our-time": {
    transcriptNoteZh: "部分单集提供下载文字稿；学术圆桌听观点交锋。",
    dictationTaskZh: "听写学者英式礼貌反驳的 4 句，标出让步与转折标记。",
    summaryTaskZh: "用 100 词概括三位学者分歧核心、共同点及主持人的引导手法。",
  },
  "listen-30-law-school-lecture": {
    transcriptNoteZh: "部分课程提供录音与笔记；判例分析听审查标准。",
    dictationTaskZh: "听写判例分析段 5 句，核对法律术语的重音与同位语。",
    summaryTaskZh: "用 90 词概括宪法争议点、所采用的审查标准及判决推理。",
  },
  "listen-31-neuroscience-podcast": {
    transcriptNoteZh: "官网提供完整文字稿；实验方案段适合分段精听。",
    dictationTaskZh: "听写实验方案描述段（6 句），核对步骤顺序与剂量/时长数字。",
    summaryTaskZh: "用 95 词概括推荐协议步骤、所引关键研究及潜在局限。",
  },
  "listen-32-medical-journal-podcast": {
    transcriptNoteZh: "NEJM 附访谈文字稿；研究访谈听终点与统计。",
    dictationTaskZh: "听写研究结果句 4 句，核对统计数字与置信区间读法。",
    summaryTaskZh: "用 90 词概括主要终点、样本量与方法学局限及临床意义。",
  },
  "listen-33-immigration-stories-podcast": {
    transcriptNoteZh: "NPR 附文字稿；个人叙事听情感与代际视角。",
    dictationTaskZh: "听写个人叙事段 5 句，标记情感语调变化的关键词。",
    summaryTaskZh: "用 85 词总结嘉宾身份挑战、节目如何呈现多代际视角及结论。",
  },
  "listen-34-education-reform-debate": {
    transcriptNoteZh: "官网附补充材料；政策辩论听双方最强论点。",
    dictationTaskZh: "听写政策辩论 4 句，分别标出双方立场与逻辑连接词。",
    summaryTaskZh: "用 90 词概括支持与反对的核心分歧、所引案例及未决问题。",
  },
  "listen-35-startup-founder-interview": {
    transcriptNoteZh: "NPR 附文字稿；创业故事听至暗时刻与转折。",
    dictationTaskZh: "听写创始人至暗时刻叙述 5 句，体会语气与节奏转变。",
    summaryTaskZh: "用 85 词复述最大失败、转折点成因及创始人总结的教训。",
  },
  "listen-36-environmental-policy-debate": {
    transcriptNoteZh: "官网附摘要和相关报告链接；政策分析听正反论据。",
    dictationTaskZh: "听写政策影响句 4 句，练习被动语态密集段的停顿。",
    summaryTaskZh: "用 90 词概括正反核心论据、引用的数据来源及双方分歧。",
  },
  "listen-37-literary-analysis-podcast": {
    transcriptNoteZh: "原短篇可在 New Yorker 网站阅读；朗读段适合跟读模仿。",
    dictationTaskZh: "听写作家朗读的开头 5 句，标记停顿与强调位置。",
    summaryTaskZh: "用 85 词复述作家对小说结构、被忽略细节及主题的评价。",
  },
  "listen-38-philosophy-bites-interview": {
    transcriptNoteZh: "官网提供全部文字稿；哲学论证适合逐句精听。",
    dictationTaskZh: "听写核心论证段 5 句，核对抽象概念与逻辑连接词。",
    summaryTaskZh: "用 90 词重构哲学家论证步骤（前提→结论），写明主持人质疑。",
  },
  "listen-39-neuroethics-discussion": {
    transcriptNoteZh: "部分单集附补充阅读；伦理讨论听让步与立场。",
    dictationTaskZh: "听写伦理困境描述段 4 句，标出所有让步从句。",
    summaryTaskZh: "用 85 词概括核心伦理张力、各方立场及监管建议。",
  },
  "listen-40-ai-safety-podcast": {
    transcriptNoteZh: "官网附参考论文；对齐问题听条件句密度。",
    dictationTaskZh: "听写一个对齐失败场景的技术描述 5 句，核对条件句嵌套。",
    summaryTaskZh: "用 95 词概括失败场景、背后机制及研究者提出的缓解策略。",
  },
  "listen-41-cross-cultural-communication": {
    transcriptNoteZh: "NPR 附文字稿；职场对话听文化差异标记。",
    dictationTaskZh: "听写两段跨文化职场对话（各 3 句），对比不同反馈语气。",
    summaryTaskZh: "用 80 词概括不同文化在同一场景的反应差异及节目建议。",
  },
  "listen-42-academic-debate-climate": {
    transcriptNoteZh: "YouTube 官方频道有完整录像；辩论总结陈词适合跟读。",
    dictationTaskZh: "听写总结陈词段 5 句，标出倒装与排比修辞。",
    summaryTaskZh: "用 100 词概括正方对'紧急'的定义、反方最强实证反驳及裁判倾向。",
  },
  "listen-43-tech-ethics-panel": {
    transcriptNoteZh: "Stanford HAI 附活动录像与摘要；小组讨论听共识与分歧。",
    dictationTaskZh: "听写监管建议段 4 句，收集 10 个政策术语。",
    summaryTaskZh: "用 90 词概括共识点、最大分歧、建议的监管工具及落地难点。",
  },
  "listen-44-entrepreneurial-mindset-series": {
    transcriptNoteZh: "a16z 官网附摘要；创业分析听护城河与飞轮。",
    dictationTaskZh: "听写市场分析段 4 句，练习商业术语自然嵌入。",
    summaryTaskZh: "用 85 词概括投资人最看重的信号、行业核心判断及支持案例。",
  },
  "listen-45-healthcare-system-comparison": {
    transcriptNoteZh: "官网提供完整文字稿；政策比较适合分段精听。",
    dictationTaskZh: "听写政策比较段 4 句，核对复杂句子节奏与术语。",
    summaryTaskZh: "用 95 词概括两种体系核心差异、患者体验差异及政策取舍。",
  },
  "listen-46-literature-close-reading": {
    transcriptNoteZh: "无官方文字稿——纯精听训练。",
    dictationTaskZh: "听写文本分析段 5 句，标出文学批评术语与论证连接。",
    summaryTaskZh: "用 85 词复述评论者如何解读核心隐喻、彼此分歧及达成一致处。",
  },
  "listen-47-neuroethics-brain-interface": {
    transcriptNoteZh: "官网附相关学术论文；神经伦理听条件句嵌套。",
    dictationTaskZh: "听写伦理分析段 4 句，标出所有条件从句与让步。",
    summaryTaskZh: "用 90 词概括脑机接口新伦理问题、现有法律局限及建议。",
  },
  "listen-48-ai-art-copyright-debate": {
    transcriptNoteZh: "Lawfare 附完整文字稿；法理论证听逻辑连接词。",
    dictationTaskZh: "听写法理论证段 5 句，核对 fair Use/侵权边界术语。",
    summaryTaskZh: "用 95 词概括核心争议、两位专家立场分歧及最终裁决倾向。",
  },
  "listen-49-startup-failure-stories": {
    transcriptNoteZh: "无官方文字稿——高阶裸听训练。",
    dictationTaskZh: "裸听完口头复述三句死因，再回听核对商业与现金流术语。",
    summaryTaskZh: "用 80 词区分倒闭的直接原因与根本原因，重述创始人最后悔的决定。",
  },
  "listen-50-native-speed-roundtable": {
    transcriptNoteZh: "Crooked Media 附精选引言；母语速圆桌适合裸听-对照。",
    dictationTaskZh: "挑战听写 30 秒最快语速段，标注连读、缩略与政治术语。",
    summaryTaskZh: "用 90 词复述讨论涉及的政治策略、主持人立场差异及结论。",
  },
};
