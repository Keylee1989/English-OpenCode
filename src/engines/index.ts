/**
 * Engine & layer registry - single source of truth for what exists.
 *
 * This exists so the UI can NEVER pretend a feature is done.
 * Every module added in later phases must flip its own status here,
 * backed by tests and a working implementation.
 */

export type EngineStatus = "not-implemented" | "partial" | "ready";
export type EngineCategory = "learning" | "ai" | "infrastructure";

export interface EngineDescriptor {
  id: string;
  nameEn: string;
  nameZh: string;
  /** What it is for; shown to the user as an honest progress map. */
  purposeZh: string;
  category: EngineCategory;
  status: EngineStatus;
}

const learningEngines: EngineDescriptor[] = [
  {
    id: "curriculum",
    nameEn: "Curriculum Engine",
    nameZh: "课程引擎",
    purposeZh: "结构化课程与内容组织（零基础 → 沉浸式）",
    category: "learning",
    status: "partial",
  },
  {
    id: "student-model",
    nameEn: "Student Model",
    nameZh: "学习者模型",
    purposeZh: "持续估计各项真实能力（不是正确率）",
    category: "learning",
    status: "partial",
  },
  {
    id: "knowledge-model",
    nameEn: "Knowledge Model",
    nameZh: "知识掌握模型",
    purposeZh: "跟踪每个知识点从“见过”到“迁移”的状态",
    category: "learning",
    status: "partial",
  },
  {
    id: "knowledge-graph",
    nameEn: "Knowledge Graph",
    nameZh: "知识图谱",
    purposeZh: "词根、搭配、语法点之间的关联网络",
    category: "learning",
    status: "partial",
  },
  {
    id: "memory",
    nameEn: "Memory Engine",
    nameZh: "记忆引擎",
    purposeZh: "遗忘建模与长期记忆维护",
    category: "learning",
    status: "partial",
  },
  {
    id: "srs",
    nameEn: "SRS Engine",
    nameZh: "间隔重复引擎",
    purposeZh: "安排复习时机，防止无效重复",
    category: "learning",
    status: "partial",
  },
  {
    id: "adaptive",
    nameEn: "Adaptive Learning Engine",
    nameZh: "自适应学习引擎",
    purposeZh: "根据能力决定学什么、练什么、难度多大",
    category: "learning",
    status: "not-implemented",
  },
  {
    id: "assessment",
    nameEn: "Assessment Engine",
    nameZh: "测评引擎",
    purposeZh: "里程碑与最终能力评估（含未见材料）",
    category: "learning",
    status: "partial",
  },
  {
    id: "planner",
    nameEn: "Daily Planner",
    nameZh: "每日计划器",
    purposeZh: "按可用时间生成优先级计划",
    category: "learning",
    status: "partial",
  },
  {
    id: "vocabulary",
    nameEn: "Vocabulary Engine",
    nameZh: "词汇引擎",
    purposeZh: "12000+ 词库、词块、搭配与产出训练",
    category: "learning",
    status: "partial",
  },
  {
    id: "grammar",
    nameEn: "Grammar Engine",
    nameZh: "语法引擎",
    purposeZh: "理解→识别→回忆→产出→迁移的语法训练",
    category: "learning",
    status: "partial",
  },
  {
    id: "phonics",
    nameEn: "Phonics Engine",
    nameZh: "自然拼读引擎",
    purposeZh: "字母→音素→拼读→连读的完整路径",
    category: "learning",
    status: "partial",
  },
  {
    id: "pronunciation",
    nameEn: "Pronunciation Engine",
    nameZh: "发音引擎",
    purposeZh: "发音模仿、反馈与口语输出支持",
    category: "learning",
    status: "not-implemented",
  },
  {
    id: "listening",
    nameEn: "Listening Engine",
    nameZh: "听力引擎",
    purposeZh: "音素辨析 → 真实语速材料",
    category: "learning",
    status: "partial",
  },
  {
    id: "speaking",
    nameEn: "Speaking Engine",
    nameZh: "口语引擎",
    purposeZh: "跟读 ≠ 口语；自由表达与陌生话题训练",
    category: "learning",
    status: "partial",
  },
  {
    id: "reading",
    nameEn: "Reading Engine",
    nameZh: "阅读引擎",
    purposeZh: "句子→分级读物→网页新闻长文",
    category: "learning",
    status: "not-implemented",
  },
  {
    id: "writing",
    nameEn: "Writing Engine",
    nameZh: "写作引擎",
    purposeZh: "单词→句子→段落→邮件→议论文",
    category: "learning",
    status: "not-implemented",
  },
  {
    id: "real-world",
    nameEn: "Real-world English Engine",
    nameZh: "真实英语引擎",
    purposeZh: "美式口语、俚语、语域与真实场景覆盖",
    category: "learning",
    status: "not-implemented",
  },
  {
    id: "error-analysis",
    nameEn: "Error Analysis Engine",
    nameZh: "错误分析引擎",
    purposeZh: "错误银行：发现高频错误并针对性训练",
    category: "learning",
    status: "partial",
  },
  {
    id: "progress",
    nameEn: "Progress Engine",
    nameZh: "进度引擎",
    purposeZh: "真实能力进度展示（非完成率）",
    category: "learning",
    status: "partial",
  },
  {
    id: "gamification",
    nameEn: "Gamification Engine",
    nameZh: "游戏化引擎",
    purposeZh: "XP / 连续学习，只绑定真实学习行为",
    category: "learning",
    // Phase 4-B v0: XP/streak/level/badges persisted in Dexie (schema v5),
    // awarded only on real lesson/practice/review/drill/assessment completion.
    status: "partial",
  },
  {
    id: "achievement",
    nameEn: "Achievement Engine",
    nameZh: "成就引擎",
    purposeZh: "里程碑徽章（绑定能力证据）",
    category: "learning",
    status: "not-implemented",
  },
];

const aiEngines: EngineDescriptor[] = [
  {
    id: "ai-provider",
    nameEn: "AI Provider Layer",
    nameZh: "AI 服务层",
    purposeZh: "OpenAI 兼容 Provider 抽象（密钥永不入库/入前端代码）",
    category: "ai",
    // Phase 4-A: interface + OpenAI-compatible implementation + presets +
    // service layer (chat/explanation/exercise/writing), all unit-tested.
    // Partial: no settings UI wiring yet; key entry UX arrives in Phase 4-B.
    status: "partial",
  },
  {
    id: "ai-tutor",
    nameEn: "AI Tutor Engine",
    nameZh: "AI 导师引擎",
    purposeZh: "个性化讲解、纠错分析（增强层，可离线降级）",
    category: "ai",
    // Phase 4-A: Student Context Builder + tutor service layer exist and are
    // tested. Partial: no chat UI yet (deliberately out of scope this phase).
    status: "partial",
  },
  {
    id: "ai-conversation",
    nameEn: "AI Conversation Engine",
    nameZh: "AI 会话引擎",
    purposeZh: "角色扮演与开放对话练习",
    category: "ai",
    status: "not-implemented",
  },
];

const infrastructureLayers: EngineDescriptor[] = [
  {
    id: "persistence",
    nameEn: "Local Persistence Layer",
    nameZh: "本地持久化层",
    purposeZh: "IndexedDB（Dexie）：学习记录/记忆状态/错误银行/设置",
    category: "infrastructure",
    // Real: schema v1 opens, writes and reads (covered by tests).
    // Partial: more tables arrive with curriculum/content phases.
    status: "partial",
  },
  {
    id: "import-export",
    nameEn: "Import/Export Layer",
    nameZh: "导入导出层",
    purposeZh: "schemaVersion 备份与恢复（事务性）",
    category: "infrastructure",
    // Real for current schema; must grow with every schema bump.
    status: "partial",
  },
  {
    id: "sync-adapter",
    nameEn: "Sync Adapter",
    nameZh: "同步适配层",
    purposeZh: "未来接入 Supabase/Firebase/自建后端的唯一接口缝",
    category: "infrastructure",
    // Seam only - DisabledSyncAdapter performs no syncing at all.
    status: "not-implemented",
  },
  {
    id: "pwa",
    nameEn: "PWA Layer",
    nameZh: "PWA 层",
    purposeZh: "manifest + Service Worker 预缓存 + iOS 适配",
    category: "infrastructure",
    // Real after build: installable, offline app shell.
    // Partial: media caching & advanced update UX come later.
    status: "partial",
  },
];

export const ENGINE_REGISTRY: readonly EngineDescriptor[] = [
  ...learningEngines,
  ...aiEngines,
  ...infrastructureLayers,
];

/** Module ids required by the master product spec (§6), all 29 of them. */
export const REQUIRED_MODULE_IDS = [
  "curriculum",
  "student-model",
  "knowledge-model",
  "knowledge-graph",
  "memory",
  "srs",
  "adaptive",
  "assessment",
  "planner",
  "vocabulary",
  "grammar",
  "phonics",
  "pronunciation",
  "listening",
  "speaking",
  "reading",
  "writing",
  "real-world",
  "ai-tutor",
  "ai-conversation",
  "error-analysis",
  "progress",
  "gamification",
  "achievement",
  "persistence",
  "import-export",
  "sync-adapter",
  "ai-provider",
  "pwa",
] as const;

export function findEngine(id: string): EngineDescriptor | undefined {
  return ENGINE_REGISTRY.find((engine) => engine.id === id);
}
