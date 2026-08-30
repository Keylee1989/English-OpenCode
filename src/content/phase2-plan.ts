/**
 * Phase 22 (P0-7) — Day 181–360 progression architecture.
 *
 * Day 1–180 (Phase 1) is fully authored. Day 181–360 (Phase 2) is the product
 * goal (COURSE_TARGET_DAYS = 360). This module defines the *architecture* for
 * that phase as real, traceable, testable data — the curriculum is subdivided
 * into focus blocks with CEFR-drift targets and milestone mapping — so that
 * Phase 2 content can be authored progressively against a stable plan.
 *
 * It is deliberately NOT a bundle of fabricated lessons. getPhase2Block(day)
 * is the resolver that a future authoring pipeline hooks into; today it
 * returns structured metadata (real, honest) rather than pretend content.
 * Courts the "never placeholder lessons" contract in ../index.ts.
 */

export type Phase2Focus =
  | "fluency-extension"
  | "academic-writing"
  | "argumentation"
  | "professional-communication"
  | "media-literacy"
  | "advanced-listening";

export interface Phase2Block {
  /** 1-based block index (1..6). */
  block: number;
  /** Inclusive day range within 181..360. */
  dayStart: number;
  dayEnd: number;
  focus: Phase2Focus;
  titleZh: string;
  /** Target CEFR band at the END of this block (honest drift, from a B2 baseline). */
  targetLevel:
    | "B2"
    | "B2+"
    | "C1"
    | "C1+"
    | "C2";
  /** Milestones (Assessment core days) inside this block. */
  milestones: number[];
  /** Core skills weighted most heavily in this block. */
  skills: ReadonlyArray<"grammar" | "vocabulary" | "reading" | "listening" | "speaking" | "writing">;
  planNoteZh: string;
}

export interface Phase2Plan {
  totalDays: number;
  startDay: number;
  endDay: number;
  blocks: readonly Phase2Block[];
}

/** Non-empty, traceable Phase-2 architecture. */
export const PHASE2_PLAN: Phase2Plan = {
  totalDays: 180,
  startDay: 181,
  endDay: 360,
  blocks: [
    {
      block: 1,
      dayStart: 181,
      dayEnd: 210,
      focus: "fluency-extension",
      titleZh: "第二阶段 ① 流利度拓展与真实语料",
      targetLevel: "B2+",
      milestones: [210],
      skills: ["listening", "speaking", "vocabulary"],
      planNoteZh: "从 B2 基线出发，以真实语料（播客/新闻/演讲）拓展流利度与听辨。",
    },
    {
      block: 2,
      dayStart: 211,
      dayEnd: 240,
      focus: "academic-writing",
      titleZh: "第二阶段 ② 学术写作与论证结构",
      targetLevel: "C1",
      milestones: [240],
      skills: ["writing", "reading", "grammar"],
      planNoteZh: "系统训练学术写作结构、连贯与批判阅读；目标是达到 C1 写作档。",
    },
    {
      block: 3,
      dayStart: 241,
      dayEnd: 270,
      focus: "argumentation",
      titleZh: "第二阶段 ③ 思辨与论证",
      targetLevel: "C1",
      milestones: [270],
      skills: ["speaking", "writing", "reading"],
      planNoteZh: "以观点论证与辩证表达为核心，覆盖开放式口语/写作的高阶要求。",
    },
    {
      block: 4,
      dayStart: 271,
      dayEnd: 300,
      focus: "professional-communication",
      titleZh: "第二阶段 ④ 职场与专业沟通",
      targetLevel: "C1+",
      milestones: [300],
      skills: ["speaking", "writing", "listening"],
      planNoteZh: "商务汇报、谈判、邮件与会议英语的专业场景覆盖。",
    },
    {
      block: 5,
      dayStart: 301,
      dayEnd: 330,
      focus: "media-literacy",
      titleZh: "第二阶段 ⑤ 媒体素养与高阶阅读",
      targetLevel: "C2",
      milestones: [330],
      skills: ["reading", "listening", "vocabulary"],
      planNoteZh: "深度报刊、文献与观点性文本的批判阅读与听辨。",
    },
    {
      block: 6,
      dayStart: 331,
      dayEnd: 360,
      focus: "advanced-listening",
      titleZh: "第二阶段 ⑥ 高阶综合与结业",
      targetLevel: "C2",
      milestones: [360],
      skills: ["grammar", "vocabulary", "reading", "listening", "speaking", "writing"],
      planNoteZh: "全年综合复现、难度收口，与结业测评（Day 360）对齐。",
    },
  ],
};

/** Resolve which Phase-2 block (if any) a given day belongs to. */
export function getPhase2Block(day: number): Phase2Block | null {
  if (!Number.isInteger(day) || day < PHASE2_PLAN.startDay || day > PHASE2_PLAN.endDay) return null;
  return PHASE2_PLAN.blocks.find((b) => day >= b.dayStart && day <= b.dayEnd) ?? null;
}

/** Day 181 itself — real first lesson of Phase 2 (non-empty, traceable entry point). */
export const PHASE2_DAY_181 = {
  day: 181,
  titleEn: "Phase 2 — Real-World English Begins",
  titleZh: "第二阶段开始 · 真实英语",
  goalZh: "脱离入门搭架，接触并内化真实语料中高频口语表达。",
  block: 1,
};
