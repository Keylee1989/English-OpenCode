/**
 * Daily Planner v0 - rule-based adaptive planning (NO AI).
 *
 * Block order follows the master flow: Review -> New Lesson -> Practice ->
 * Assessment. Adaptation rules (explicit, unit-tested):
 *  - due reviews always come first (critical SRS)
 *  - listening accuracy < 50% over recent events  -> extra listening drills
 *  - items recognized but never produced          -> extra production drills
 *  - review-failure-heavy days surface a notice and easier suggested modes
 *    (handled by getDueCards' mode selection)
 */
import { db } from "@/data/db";
import { AUTHORED_DAYS, COURSE_TARGET_DAYS, getDayContent } from "@/content";
import { getDueCards, type DueCardView } from "@/engines/memory/memory-engine-v0";
import { recentAccuracy } from "@/engines/student/student-model-v0";
import { syncRemedialCards } from "@/engines/errors/remedial-cards";
import {
  getRemedialSpecs,
  type RemedialSpec,
} from "@/engines/errors/error-analysis-v0";
import { MILESTONE_DAYS } from "@/engines/assessment/assessment-v0";

export type PlanBlock =
  | { kind: "review"; titleZh: string; reasonZh: string; dueCount: number }
  | { kind: "drill"; titleZh: string; reasonZh: string; specs: RemedialSpec[] }
  | { kind: "lesson"; titleZh: string; reasonZh: string; day: number }
  | {
      kind: "practice";
      titleZh: string;
      reasonZh: string;
      day: number;
      extraListening: boolean;
      extraRecall: boolean;
    }
  | { kind: "assessment"; titleZh: string; reasonZh: string; day: number };

export interface DayPlan {
  dateISO: string;
  currentDay: number;
  blocks: PlanBlock[];
  /** Honest notices shown on home screen (why today looks the way it does). */
  notices: string[];
  dueCards: DueCardView[];
}

/** Highest completed day + 1; capped at authored content. */
export async function resolveCurrentDay(): Promise<number> {
  const completed = await db.dayProgress.where("status").equals("completed").toArray();
  const maxCompleted = completed.reduce((max, row) => Math.max(max, row.day), 0);
  return Math.min(maxCompleted + 1, AUTHORED_DAYS);
}

export interface WeaknessSignals {
  extraListening: boolean;
  extraRecall: boolean;
  listeningAccuracy: number | null;
  productionGapCount: number;
}

/**
 * Rule inputs for adaptation. Production gap = items that have been
 * recognized (stage >= recognized) but never produced by typing/building.
 */
export async function analyzeWeaknesses(): Promise<WeaknessSignals> {
  const listeningAccuracy = await recentAccuracy("listening", 10);
  const states = await db.memoryStates.toArray();
  const productionGapCount = states.filter(
    (row) => row.stage !== "unseen" && row.producedCount === 0,
  ).length;
  return {
    extraListening: listeningAccuracy !== null && listeningAccuracy < 0.5,
    extraRecall: productionGapCount > 0,
    listeningAccuracy,
    productionGapCount,
  };
}

export function todayISO(nowMs: number = Date.now()): string {
  const date = new Date(nowMs);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export async function buildPlan(nowMs: number = Date.now()): Promise<DayPlan> {
  const dateISO = todayISO(nowMs);
  const notices: string[] = [];
  const blocks: PlanBlock[] = [];

  // Error -> SRS auto-loop (Phase 3b): repeated errors become review cards.
  await syncRemedialCards(nowMs);

  // 1) Critical SRS first.
  const due = await getDueCards(nowMs);
  if (due.length > 0) {
    const lapsed = due.filter((card) => card.state.lapses >= 2).length;
    blocks.push({
      kind: "review",
      titleZh: `复习到期知识（${due.length} 个）`,
      reasonZh:
        lapsed > 0
          ? `${lapsed} 个项目之前复习失败，已自动降低难度并优先安排`
          : "间隔重复到期，先巩固再学新内容",
      dueCount: due.length,
    });
  }

  // 2) Targeted drills from repeated errors (Error Analysis Engine).
  const remedialSpecs = await getRemedialSpecs(3);
  if (remedialSpecs.length > 0) {
    blocks.push({
      kind: "drill",
      titleZh: `专项训练（${remedialSpecs.length} 类）`,
      reasonZh: remedialSpecs.map((spec) => spec.reasonZh).join("；"),
      specs: remedialSpecs,
    });
    notices.push("检测到重复错误，今日已插入专项训练。");
  }

  const currentDay = await resolveCurrentDay();
  if (currentDay <= AUTHORED_DAYS) {
    const content = getDayContent(currentDay);
    const progress = await db.dayProgress.get(currentDay);

    // Phase 6: milestone auto-assessment. When the learner has COMPLETED a
    // milestone day (30/60/90) but no formal session is recorded for it yet,
    // insert the assessment block right here — before new material.
    const completedRows = await db.dayProgress.where("status").equals("completed").toArray();
    const maxCompleted = completedRows.reduce((max, row) => Math.max(max, row.day), 0);
    const doneMilestoneDays = new Set(
      (await db.assessments.where("day").anyOf([...MILESTONE_DAYS]).toArray()).map((r) => r.day),
    );
    // Trigger ONLY when the just-completed day IS a milestone (spec: 当天完成).
    const pendingMilestone =
      (MILESTONE_DAYS as readonly number[]).includes(maxCompleted) &&
      !doneMilestoneDays.has(maxCompleted)
        ? maxCompleted
        : undefined;
    if (pendingMilestone !== undefined) {
      blocks.push({
        kind: "assessment",
        titleZh: `⭐ 今日里程碑测评 · Day ${pendingMilestone}`,
        reasonZh: `你已完成第 ${pendingMilestone} 天学习。阶段测评会计入成长报告，请认真作答。`,
        day: pendingMilestone,
      });
    }

    if (!progress || progress.status !== "completed") {
      if (!progress) {
        blocks.push({
          kind: "lesson",
          titleZh: content ? content.titleZh : `第 ${currentDay} 天课程`,
          reasonZh: "学习今天的生词与句型",
          day: currentDay,
        });
      }
      const weakness = await analyzeWeaknesses();
      if (weakness.extraListening) {
        notices.push(
          `听力近 10 题正确率 ${Math.round((weakness.listeningAccuracy ?? 0) * 100)}%，今日练习已增加听力题`,
        );
      }
      if (weakness.extraRecall) {
        notices.push(
          `${weakness.productionGapCount} 个词“认识但没输出过”，今日练习已增加主动回忆/造句`,
        );
      }
      blocks.push({
        kind: "practice",
        titleZh: `练习：${content ? content.titleZh : `第 ${currentDay} 天`}`,
        reasonZh: "把今天学的变成能用的（识别→回忆→输出）",
        day: currentDay,
        extraListening: weakness.extraListening,
        extraRecall: weakness.extraRecall,
      });
      blocks.push({
        kind: "assessment",
        titleZh: `小测：第 ${currentDay} 天`,
        reasonZh: "验证今天的掌握情况，结果会计入能力模型",
        day: currentDay,
      });
    } else {
      notices.push(`第 ${currentDay} 天已完成。明天将按 SRS 计划复习今天的内容。`);
    }
  } else {
    notices.push(
      `前 ${AUTHORED_DAYS} 天内容已全部完成。更多天数将在后续阶段加入（目标 ${COURSE_TARGET_DAYS} 天）。`,
    );
  }

  if (blocks.length === 0) {
    notices.push("今天暂无到期复习。可以进入任意一天重新练习，或等待明天的复习计划。");
  }

  return { dateISO, currentDay, blocks, notices, dueCards: due };
}
