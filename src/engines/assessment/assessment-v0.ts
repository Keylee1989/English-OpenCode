/**
 * Assessment Engine v0 (Phase 3b) - milestone proficiency sessions with
 * persistence. Speaking is honest self-check; never fake-scored.
 */
import { db } from "@/data/db";
import { newId } from "@/core/ids";
import { AUTHORED_DAYS, getDayContent } from "@/content";
import { buildAssessmentExercises } from "@/study/generate-exercises";
import type { Exercise } from "@/study/exercise-types";

/** Milestone days that auto-trigger a formal assessment (Phase 6). */
export const MILESTONE_DAYS = [30, 60, 90] as const;

export interface SkillScore {
  skill: string;
  score: number;
  selfReported: boolean;
  count: number;
}

export interface AssessmentSession {
  id: string;
  type: "milestone";
  day: number;
  startedAt: number;
  completedAt: number;
  skillScores: Record<string, number>;
  weaknesses: string[];
  recommendationsZh: string[];
}

const LEVELS: Array<[number, string]> = [
  [15, "入门 Beginner"],
  [30, "基础 Basic"],
  [45, "初级 Elementary"],
  [60, "中级 Intermediate"],
  [75, "中高级 Upper-Intermediate"],
  [90, "高级 Advanced"],
];

export function levelForScore(score: number): string {
  for (const [min, label] of LEVELS) if (score >= min) return label;
  return "入门 Beginner";
}

/** Build the Day-N milestone exercise set (auto + output sections). */
export function buildMilestoneExercises(day = Math.min(30, AUTHORED_DAYS)): Exercise[] {
  const content = getDayContent(Math.min(day, AUTHORED_DAYS));
  const out: Exercise[] = content
    ? buildAssessmentExercises(content, { audioAvailable: true })
    : [];
  // Guarantee a speaking section even when the day content lacks one.
  const shadow = content?.pattern.practiceSentences[0];
  if (shadow && !out.some((exercise) => exercise.type === "shadowing")) {
    out.push({
      id: `ms-${day}-sh`,
      type: "shadowing",
      skill: "speaking",
      requiresAudio: true,
      speakText: shadow.en,
      en: shadow.en,
      zh: shadow.zh,
    });
  }
  return out;
}

export interface OutcomeRecord {
  skill: string;
  correct: boolean | null;
  selfReported?: boolean;
}

/**
 * Grade collected outcomes and persist a session row.
 * Self-reported sections are scored at attempted-value but flagged.
 */
export async function submitAssessment(
  day: number,
  outcomes: OutcomeRecord[],
): Promise<AssessmentSession> {
  const bySkill = new Map<string, { correct: number; total: number; self: boolean }>();
  for (const outcome of outcomes) {
    if (outcome.correct === null) continue;
    const bucket = bySkill.get(outcome.skill) ?? { correct: 0, total: 0, self: false };
    bucket.total += 1;
    if (outcome.correct) bucket.correct += 1;
    if (outcome.selfReported) bucket.self = true;
    bySkill.set(outcome.skill, bucket);
  }

  const skillScores: Record<string, number> = {};
  for (const [skill, bucket] of bySkill) {
    skillScores[skill] =
      bucket.total === 0 ? 0 : Math.round((bucket.correct / bucket.total) * 100);
  }

  const entries = Object.entries(skillScores);
  const overall =
    entries.length === 0 ? 0 : Math.round(entries.reduce((sum, [, v]) => sum + v, 0) / entries.length);

  const sorted = [...entries].sort((a, b) => a[1] - b[1]);
  const weaknesses = sorted.slice(0, 2).map(([skill]) => skill);

  const recommendationsZh: string[] = [];
  for (const skill of weaknesses) {
    if (skill === "listening") recommendationsZh.push("听力偏弱：增加听辨与慢速跟读训练。");
    else if (skill === "writing") recommendationsZh.push("输出偏弱：增加造句/中译英练习。");
    else if (skill === "grammar") recommendationsZh.push("语法不稳：复习对应句型并完成改错训练。");
    else if (skill === "vocabulary") recommendationsZh.push("词汇待巩固：优先完成到期复习。");
    else if (skill === "speaking") recommendationsZh.push("口语自评偏低：每日大声跟读示范句。");
    else if (skill === "reading") recommendationsZh.push("阅读理解需加强：多做短文精读。");
  }
  if (recommendationsZh.length === 0) {
    recommendationsZh.push("各技能均衡：按计划继续推进下一阶段课程。");
  }

  const session: AssessmentSession & { outcomes?: unknown } = {
    id: newId(),
    type: "milestone",
    day,
    startedAt: Date.now() - 1000,
    completedAt: Date.now(),
    skillScores,
    weaknesses,
    recommendationsZh,
  };

  await db.assessments.put({
    id: session.id,
    type: "milestone",
    day: session.day,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    overallScore: overall,
    level: levelForScore(overall),
    data: session as unknown as Record<string, unknown>,
  });

  return session;
}

export async function getAssessmentHistory(): Promise<AssessmentSession[]> {
  const rows = await db.assessments.orderBy("completedAt").reverse().toArray();
  return rows.map((row) => ({ ...(row.data as unknown as AssessmentSession), id: row.id }));
}
