/**
 * Daily Report v0 - real aggregation over recorded evidence.
 * Everything shown comes from learningEvents / memoryStates / abilities /
 * dailySessions. Nothing is fabricated.
 */
import { db } from "@/data/db";
import { findVocab } from "@/content";
import { SKILL_LABEL_ZH } from "@/engines/student/student-model-v0";
import { analyzeWeaknesses } from "@/engines/planner/planner-v0";

export interface SkillDayStat {
  skill: string;
  labelZh: string;
  count: number;
  correctRate: number | null;
}

export interface DailyReport {
  dateISO: string;
  generatedAt: number;
  minutesSpent: number | null;
  totalEvents: number;
  gradedEvents: number;
  overallCorrectRate: number | null;
  newItemsLearned: Array<{ id: string; titleEn: string | null }>;
  reviewsToday: { success: number; failure: number };
  perSkill: SkillDayStat[];
  errorGroups: Array<{ category: string; count: number; sampleZh: string }>;
  abilityChanges: Array<{
    skill: string;
    labelZh: string;
    from: number;
    to: number;
    delta: number;
  }>;
  suggestionsZh: string[];
  dueWithin24h: number;
}

function dayRange(dateISO: string): { start: number; end: number } {
  const [y, m, d] = dateISO.split("-").map((part) => Number.parseInt(part, 10));
  const start = new Date(y, m - 1, d).getTime();
  return { start, end: start + 86_400_000 };
}

export async function generateDailyReport(dateISO: string): Promise<DailyReport> {
  const { start, end } = dayRange(dateISO);
  const allEvents = await db.learningEvents.where("occurredAt").between(start, end).toArray();

  // Per-skill stats.
  const bySkill = new Map<string, { count: number; correct: number; graded: number }>();
  for (const event of allEvents) {
    const bucket = bySkill.get(event.skill) ?? { count: 0, correct: 0, graded: 0 };
    bucket.count += 1;
    if (event.correct !== null) {
      bucket.graded += 1;
      if (event.correct) bucket.correct += 1;
    }
    bySkill.set(event.skill, bucket);
  }
  const perSkill: SkillDayStat[] = [...bySkill.entries()].map(([skill, bucket]) => ({
    skill,
    labelZh: SKILL_LABEL_ZH[skill] ?? skill,
    count: bucket.count,
    correctRate: bucket.graded === 0 ? null : bucket.correct / bucket.graded,
  }));

  // New knowledge introduced today.
  const newItemIds = [
    ...new Set(
      allEvents.filter((event) => event.interaction === "learn-new" && event.itemId).map((e) => e.itemId as string),
    ),
  ];

  // Review outcomes today are classified by the isReview flag on events.
  let reviewSuccess = 0;
  let reviewFailure = 0;
  for (const event of allEvents) {
    if (event.meta?.["isReview"] && event.correct !== null) {
      if (event.correct) reviewSuccess += 1;
      else reviewFailure += 1;
    }
  }

  const gradedAll = allEvents.filter((event) => event.correct !== null);
  const overallCorrectRate =
    gradedAll.length === 0 ? null : gradedAll.filter((event) => event.correct === true).length / gradedAll.length;

  // Error bank groups for today.
  const errorsToday = await db.errors.where("occurredAt").between(start, end).toArray();
  const errorMap = new Map<string, { count: number; sampleZh: string }>();
  for (const error of errorsToday) {
    const bucket = errorMap.get(error.category) ?? { count: 0, sampleZh: error.descriptionZh };
    bucket.count += 1;
    errorMap.set(error.category, bucket);
  }
  const errorGroups = [...errorMap.entries()]
    .map(([category, bucket]) => ({ category, ...bucket }))
    .sort((a, b) => b.count - a.count);

  // Ability deltas vs the snapshot taken at day start.
  const session = await db.dailySessions.get(dateISO);
  const currentAbilities = await db.abilities.toArray();
  const abilityChanges = currentAbilities.map((row) => {
    const baseline = session?.dayStartAbilities?.[row.skill];
    return {
      skill: row.skill,
      labelZh: SKILL_LABEL_ZH[row.skill] ?? row.skill,
      from: baseline?.score ?? 0,
      to: Math.round(row.score * 10) / 10,
      delta:
        Math.round(((baseline ? row.score - baseline.score : row.score) + Number.EPSILON) * 10) / 10,
    };
  });
  abilityChanges.sort((a, b) => b.delta - a.delta);

  // Time spent: session duration when closed; otherwise live elapsed.
  let minutesSpent: number | null = null;
  if (session) {
    const endMs = session.endedAt ?? Date.now();
    minutesSpent = Math.max(0, Math.round((endMs - session.startedAt) / 60000));
  }

  // Suggestions: reuse the same rule inputs the planner will use tomorrow.
  const weakness = await analyzeWeaknesses();
  const suggestionsZh: string[] = [];
  if (weakness.extraListening && weakness.listeningAccuracy !== null) {
    suggestionsZh.push(`听力正确率偏低（${Math.round(weakness.listeningAccuracy * 100)}%），明天会自动增加听力练习。`);
  }
  if (weakness.extraRecall) {
    suggestionsZh.push(`${weakness.productionGapCount} 个词还停留在“认识”，明天会增加主动回忆和输出练习。`);
  }
  if (reviewFailure > 0) {
    suggestionsZh.push(`今天有 ${reviewFailure} 次复习失败，这些项目已被排到更近的时间重新巩固。`);
  }
  if (suggestionsZh.length === 0) {
    suggestionsZh.push("保持节奏：明天的复习队列已按间隔重复计划生成。");
  }

  const dueWithin24h = (
    await db.memoryStates.where("dueAt").between(Date.now(), Date.now() + 86_400_000).toArray()
  ).length;

  return {
    dateISO,
    generatedAt: Date.now(),
    minutesSpent,
    totalEvents: allEvents.length,
    gradedEvents: gradedAll.length,
    overallCorrectRate,
    newItemsLearned: newItemIds.map((id) => ({ id, titleEn: findVocab(id)?.word ?? null })),
    reviewsToday: { success: reviewSuccess, failure: reviewFailure },
    perSkill,
    errorGroups,
    abilityChanges,
    suggestionsZh,
    dueWithin24h,
  };
}
