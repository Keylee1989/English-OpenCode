/**
 * AI Tutor Context Layer - Student Context Builder (Phase 4-A).
 *
 * Aggregates the learner's real state into a compact, AI-readable context:
 *   input : Student Model (abilities/fatigue) + Error Bank stats + Knowledge
 *           stage distribution + current lesson + recent learning history
 *   output: TutorStudentContext (typed) + formatContextForAi() text block +
 *           buildTutorSystemPrompt() ready-to-use system prompt
 *
 * This layer has NO UI and NO provider dependency: the core stays offline-first.
 */
import { db, loadSettings } from "@/data/db";
import { AUTHORED_DAYS, getDayContent } from "@/content";
import type { SkillKey } from "@/core/types";
import { getAllAbilities, getFatigueIndicators } from "@/engines/student/student-model-v0";
import { getErrorStats } from "@/engines/errors/error-analysis-v0";
import { knowledgeStats } from "@/knowledge/knowledge-model-v0";
import { resolveCurrentDay } from "@/engines/planner/planner-v0";

export interface ContextAbility {
  skill: SkillKey;
  score: number;
  confidence: number;
  trend: "up" | "flat" | "down";
  evidenceCount: number;
}

export interface CurrentLessonSummary {
  day: number;
  titleZh: string;
  goalZh: string;
  grammarTopicId?: string;
  patternTitleZh: string;
  vocabWords: string[];
}

export interface RecentSessionSummary {
  dateISO: string;
  completedBlocks: number;
  assessmentScore: number | null;
}

export interface TutorStudentContext {
  generatedAt: number;
  currentDay: number;
  authoredDays: number;
  scaffoldLevel: string;
  abilities: ContextAbility[];
  weakestSkills: string[];
  fatigue: {
    recentErrorRate: number;
    avgLatencyTrendMs: number;
  };
  errors: {
    total: number;
    repeatedCategories: string[];
    weakSkills: Array<{ skill: string; accuracy: number }>;
  };
  knowledge: {
    words: number;
    grammarNodes: number;
    stageCounts: Record<string, number>;
  };
  currentLesson: CurrentLessonSummary | null;
  recentHistory: RecentSessionSummary[];
}

const STAGE_ORDER = ["seen", "recognized", "recalled", "produced", "used", "mastered", "transferred"];

async function memoryStageCounts(): Promise<Record<string, number>> {
  const rows = await db.memoryStates.toArray();
  const counts: Record<string, number> = {};
  for (const stage of STAGE_ORDER) counts[stage] = 0;
  for (const row of rows) {
    if (!row.stage || row.stage === "unseen") continue;
    counts[row.stage] = (counts[row.stage] ?? 0) + 1;
  }
  return counts;
}

function buildCurrentLesson(day: number): CurrentLessonSummary | null {
  const content = getDayContent(Math.min(day, AUTHORED_DAYS));
  if (!content) return null;
  return {
    day: content.day,
    titleZh: content.titleZh,
    goalZh: content.goalZh,
    grammarTopicId: content.grammarTopicId,
    patternTitleZh: content.pattern.titleZh,
    vocabWords: (content.vocabIds && content.vocabIds.length > 0
      ? content.vocabIds
      : content.vocab.map((entry) => entry.id)
    ).map((id) => id.replace(/^w:/, "")),
  };
}

/** Aggregate everything the tutor needs into one typed snapshot. */
export async function buildStudentContext(): Promise<TutorStudentContext> {
  const [settings, currentDay, abilityRows, fatigue, errorStats, stages] = await Promise.all([
    loadSettings(),
    resolveCurrentDay(),
    getAllAbilities(),
    getFatigueIndicators(),
    getErrorStats(),
    memoryStageCounts(),
  ]);

  const abilities: ContextAbility[] = Object.entries(abilityRows)
    .filter(([, row]) => row.evidenceCount > 0)
    .map(([skill, row]) => ({
      skill: skill as SkillKey,
      score: Math.round(row.score),
      confidence: Math.round(row.confidence * 100) / 100,
      trend: row.trend,
      evidenceCount: row.evidenceCount,
    }))
    .sort((a, b) => a.score - b.score);

  const recentSessions = await db.dailySessions.orderBy("dateISO").reverse().limit(7).toArray();

  return {
    generatedAt: Date.now(),
    currentDay,
    authoredDays: AUTHORED_DAYS,
    scaffoldLevel: settings.scaffoldLevel,
    abilities,
    weakestSkills: abilities.slice(0, 2).map((a) => a.skill),
    fatigue,
    errors: {
      total: errorStats.total,
      repeatedCategories: errorStats.repeatedCategories.slice(0, 3),
      weakSkills: errorStats.weakSkills.slice(0, 3),
    },
    knowledge: {
      words: knowledgeStats().words,
      grammarNodes: knowledgeStats().grammar,
      stageCounts: stages,
    },
    currentLesson: buildCurrentLesson(currentDay),
    recentHistory: recentSessions.map((row) => ({
      dateISO: row.dateISO,
      completedBlocks: row.completedBlocks.length,
      assessmentScore: row.assessmentScore,
    })),
  };
}
