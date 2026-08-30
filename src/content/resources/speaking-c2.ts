/**
 * Phase 15-F: Advanced Speaking Module (C2).
 * Opinion framework, 50 debate resolutions, and presentation tracks modeled
 * on American university classrooms. All prompts; no grading changes.
 */

export const OPINION_FRAMEWORK = {
  titleZh: "观点表达四步框架（Claim → Evidence → Counterargument → Conclusion）",
  steps: [
    { key: "claim", labelZh: "主张", template: "My position is that ___.", tipZh: "一句话立场，可被反驳才算合格。" },
    { key: "evidence", labelZh: "证据", template: "The strongest support comes from ___.", tipZh: "至少一条数据/事实，拒绝纯感受。" },
    { key: "counterargument", labelZh: "回应反方", template: "Critics argue ___; however, ___.", tipZh: "先复述最强反方（steel-man），再回击。" },
    { key: "conclusion", labelZh: "结论", template: "Taken together, ___.", tipZh: "重申立场并给出一个可执行推论。" },
  ],
  hedgingBank: ["It appears that...", "Evidence suggests...", "This may indicate...", "Arguably, ..."],
};

export interface DebateTopic {
  id: string;
  number: number;
  resolution: string;
  categoryZh: string;
}

const RESOLUTIONS: Array<[string, string]> = [
  ["AI-generated content should be labeled by law.", "AI"],
  ["AI should be allowed to grade student essays.", "AI"],
  ["Autonomous weapons should be banned internationally.", "AI"],
  ["Companies should pay royalties when AI trains on their data.", "AI"],
  ["AI chatbots should be banned for users under 16.", "AI"],
  ["Standardized testing should be abolished.", "education"],
  ["College tuition should be free at public universities.", "education"],
  ["Homework should be eliminated in elementary school.", "education"],
  ["Single-sex schools do more harm than good.", "education"],
  ["Vocational training deserves equal prestige with college.", "education"],
  ["Governments should require a backdoor into encrypted messaging.", "privacy"],
  ["Facial recognition in public spaces should be banned.", "privacy"],
  ["Employers may monitor work devices without notice.", "privacy"],
  ["Children's data should be off-limits to advertisers entirely.", "privacy"],
  ["Health insurers should access wearable-device data.", "privacy"],
  ["A four-day work week should become the national standard.", "economy"],
  ["The federal minimum wage should be tied to inflation.", "economy"],
  ["Tariffs protect domestic workers more than they hurt them.", "economy"],
  ["Cash should be phased out of the economy.", "economy"],
  ["Antitrust law should break up the largest tech platforms.", "economy"],
  ["Compulsory voting would strengthen American democracy.", "politics"],
  ["Term limits for Congress would improve governance.", "politics"],
  ["Lowering the voting age to 16 is a good idea.", "politics"],
  ["Super PACs should be unconstitutional.", "politics"],
  ["The Electoral College should be replaced by popular vote.", "politics"],
  ["Social media platforms are responsible for user misinformation.", "technology"],
  ["Self-driving cars should be allowed before perfect safety records.", "technology"],
  ["Right-to-repair laws should cover all electronics.", "technology"],
  ["Space colonization spending is justified on Earth-bound grounds.", "technology"],
  ["Quantum computing export controls protect national security.", "technology"],
  ["Remote work weakens company culture more than it helps talent.", "society"],
  ["Cities should ban private cars from downtown cores.", "society"],
  ["Professional athletes deserve their compensation levels.", "society"],
  ["Zoos have outlived their purpose.", "society"],
  ["Universal childcare should be a public service like K-12.", "society"],
  ["Fast fashion should face a carbon tax per garment.", "society"],
  ["Nuclear power is essential to fighting climate change.", "society"],
  ["College athletes should be salaried employees.", "society"],
  ["The U.S. should adopt the metric system nationwide.", "society"],
  ["Public libraries should lend tools, instruments, and equipment.", "society"],
  ["The U.S. should make Election Day a national holiday.", "politics"],
  ["Algorithmic hiring tools should face mandatory bias audits.", "AI"],
  ["Cities should convert one car lane to green space on every major road.", "society"],
  ["Universities should drop legacy preferences entirely.", "education"],
  ["High-speed rail deserves priority over highway expansion.", "economy"],
  ["Streaming platforms must disclose viewership numbers publicly.", "media"],
  ["Professional licensing requirements should be reduced for mid-career changers.", "economy"],
  ["Schools should start no earlier than 8:30 a.m. by state law.", "education"],
  ["Local news should receive public funding with strict independence rules.", "media"],
  ["Secondhand marketplaces should verify listings like auction houses do.", "society"],
];

export const DEBATE_TOPICS: readonly DebateTopic[] = RESOLUTIONS.map(
  ([resolution, categoryZh], i) => ({
    id: `debate-${i + 1}`,
    number: i + 1,
    resolution,
    categoryZh,
  }),
);

export interface PresentationTrack {
  id: string;
  minutes: number;
  titleEn: string;
  structureZh: string[];
  assessmentFocusZh: string;
}

/** American university-classroom presentation tracks (5/10/15 minutes). */
export const PRESENTATION_TRACKS: readonly PresentationTrack[] = [
  {
    id: "pres-5",
    minutes: 5,
    titleEn: "Lightning Brief (5 min)",
    structureZh: ["开场钩子 30 秒", "问题陈述 60 秒", "证据两点 各 60 秒", "结论与行动建议 60 秒"],
    assessmentFocusZh: "只考结构与时间控制：超时或漏环节即重录。",
  },
  {
    id: "pres-10",
    minutes: 10,
    titleEn: "Seminar Talk (10 min)",
    structureZh: ["背景与研究空白 2 分钟", "方法/论证路径 3 分钟", "发现与反方回应 3 分钟", "局限与下一步 2 分钟"],
    assessmentFocusZh: "考察 Q&A 应对：准备三个预期问题的回答。",
  },
  {
    id: "pres-15",
    minutes: 15,
    titleEn: "Conference Presentation (15 min)",
    structureZh: ["文献定位 3 分钟", "框架与假设 3 分钟", "数据分析 5 分钟", "反例讨论 2 分钟", "贡献与展望 2 分钟"],
    assessmentFocusZh: "学术语域：hedging 密度、名词化使用、图表口述准确性。",
  },
];
