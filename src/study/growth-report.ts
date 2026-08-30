/**
 * Growth Report (Phase 5) - compares the FIRST vs LATEST milestone assessment
 * and current ability trends. Everything derives from real recorded evidence:
 * if a learner has no assessments yet, the report says so honestly.
 */
import { db } from "@/data/db";
import type { AssessmentSessionRow } from "@/data/db";
import { AUTHORED_DAYS } from "@/content";
import { getAllAbilities } from "@/engines/student/student-model-v0";

import { MILESTONE_DAYS } from "@/engines/assessment/assessment-v0";
export { MILESTONE_DAYS };

export interface SkillDelta {
  skill: string;
  labelZh: string;
  first: number | null;
  latest: number | null;
  delta: number | null;
}

export interface GrowthReport {
  generatedAt: number;
  authoredDays: number;
  milestonesCompleted: number[];
  sessionsCount: number;
  overall: { first: number | null; latest: number | null; delta: number | null };
  skills: SkillDelta[];
  abilities: Array<{ skill: string; score: number; trend: string }>;
}

const LABELS: Record<string, string> = {
  vocabulary: "词汇",
  grammar: "语法",
  phonics: "自然拼读",
  listening: "听力",
  speaking: "口语",
  reading: "阅读",
  writing: "写作",
};

function toSession(row: AssessmentSessionRow) {
  const data = row.data as { skillScores?: Record<string, number>; overallScore?: number };
  return {
    day: row.day,
    completedAt: row.completedAt,
    overall: typeof data.overallScore === "number" ? data.overallScore : row.overallScore,
    skills: data.skillScores ?? {},
  };
}

export async function computeGrowthReport(): Promise<GrowthReport> {
  const [rows, abilities, sessions] = await Promise.all([
    db.assessments.orderBy("completedAt").toArray(),
    getAllAbilities(),
    db.dailySessions.count(),
  ]);

  const sessionsParsed = rows.map(toSession);
  const first = sessionsParsed[0] ?? null;
  const latest = sessionsParsed.length > 1 ? sessionsParsed[sessionsParsed.length - 1] : null;

  const skillKeys = new Set<string>([
    ...Object.keys(first?.skills ?? {}),
    ...Object.keys(latest?.skills ?? {}),
    "vocabulary",
    "listening",
    "reading",
    "writing",
    "speaking",
  ]);
  const preferred = ["vocabulary", "listening", "reading", "writing", "speaking", "grammar"];
  const ordered = [...preferred.filter((k) => skillKeys.has(k)), ...[...skillKeys].filter((k) => !preferred.includes(k))];

  const skills: SkillDelta[] = ordered.map((skill) => {
    const f = first?.skills?.[skill];
    const l = latest?.skills?.[skill];
    return {
      skill,
      labelZh: LABELS[skill] ?? skill,
      first: typeof f === "number" ? f : null,
      latest: typeof l === "number" ? l : null,
      delta: typeof f === "number" && typeof l === "number" ? l - f : null,
    };
  });

  const overallFirst = first?.overall ?? null;
  const overallLatest = latest?.overall ?? null;

  const completedMilestones = MILESTONE_DAYS.filter((day) =>
    sessionsParsed.some((s) => s.day === day),
  );

  return {
    generatedAt: Date.now(),
    authoredDays: AUTHORED_DAYS,
    milestonesCompleted: [...completedMilestones],
    sessionsCount: sessions,
    overall: {
      first: overallFirst,
      latest: overallLatest,
      delta:
        overallFirst !== null && overallLatest !== null ? overallLatest - overallFirst : null,
    },
    skills,
    abilities: Object.entries(abilities)
      .filter(([, row]) => row.evidenceCount > 0)
      .map(([skill, row]) => ({ skill, score: Math.round(row.score), trend: row.trend })),
  };
}

function arrow(delta: number | null): string {
  if (delta === null) return "—";
  if (delta > 0) return `▲ +${delta}`;
  if (delta < 0) return `▼ ${delta}`;
  return "＝ 0";
}

/** Human-readable Chinese report text (also used for .txt export). */
export function formatGrowthReportText(report: GrowthReport): string {
  const lines: string[] = [];
  lines.push("English360 · 成长报告");
  lines.push(`生成时间：${new Date(report.generatedAt).toLocaleString()}`);
  lines.push("");
  lines.push(
    `里程碑测评：${
      report.milestonesCompleted.length > 0
        ? report.milestonesCompleted.map((d) => `Day ${d}`).join("、")
        : "尚无（完成 Day 30/60/90 后自动生成）"
    }`,
  );
  lines.push(
    `总体分：${report.overall.first ?? "—"} → ${report.overall.latest ?? "—"}（${arrow(report.overall.delta)}）`,
  );
  lines.push("");
  lines.push("技能变化（首次测评 → 最近测评）：");
  for (const s of report.skills) {
    if (s.first === null && s.latest === null) continue;
    lines.push(
      `  ${s.labelZh}：${s.first ?? "—"} → ${s.latest ?? "—"}（${arrow(s.delta)}）`,
    );
  }
  lines.push("");
  if (report.abilities.length > 0) {
    lines.push(
      "当前能力模型（低→高）：" +
        [...report.abilities]
          .sort((a, b) => a.score - b.score)
          .map((a) => `${LABELS[a.skill] ?? a.skill}:${a.score}(${a.trend})`)
          .join(" "),
    );
  } else {
    lines.push("当前能力模型：暂无足够证据。");
  }
  lines.push(`学习天数：${report.sessionsCount}`);
  return lines.join("\n");
}
