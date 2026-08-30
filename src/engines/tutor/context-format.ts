/** Formatting half of the context builder (kept separate for authoring size). */
import type { TutorStudentContext } from "@/engines/tutor/context-builder";

/** Serialize the snapshot into a compact text block for AI prompts. */
export function formatContextForAi(ctx: TutorStudentContext): string {
  const lines: string[] = [];
  lines.push(`[student-context] day=${ctx.currentDay}/${ctx.authoredDays} scaffold=${ctx.scaffoldLevel}`);

  if (ctx.abilities.length === 0) {
    lines.push("abilities: no evidence yet (true beginner)");
  } else {
    const abilityText = ctx.abilities
      .map((a) => `${a.skill}:${a.score}(${a.trend},n=${a.evidenceCount})`)
      .join(" ");
    lines.push(`abilities(low->high): ${abilityText}`);
    lines.push(`weakest: ${ctx.weakestSkills.join(", ") || "n/a"}`);
  }

  lines.push(
    `fatigue: errorRate=${Math.round(ctx.fatigue.recentErrorRate * 100)}% latencyTrend=${Math.round(ctx.fatigue.avgLatencyTrendMs)}ms`,
  );

  if (ctx.errors.total > 0) {
    const repeated = ctx.errors.repeatedCategories.join(", ") || "none";
    const weak = ctx.errors.weakSkills.map((w) => `${w.skill}(${Math.round(w.accuracy * 100)}%)`).join(", ") || "none";
    lines.push(`errors: total=${ctx.errors.total}; repeated=[${repeated}]; weakSkills=[${weak}]`);
  } else {
    lines.push("errors: none recorded");
  }

  const stages = Object.entries(ctx.knowledge.stageCounts)
    .filter(([, n]) => n > 0)
    .map(([stage, n]) => `${stage}=${n}`)
    .join(" ");
  lines.push(
    `knowledge: lexicon=${ctx.knowledge.words} words, ${ctx.knowledge.grammarNodes} grammar nodes${stages ? `; stages: ${stages}` : ""}`,
  );

  if (ctx.currentLesson) {
    const lesson = ctx.currentLesson;
    lines.push(
      `current-lesson: d${lesson.day} "${lesson.titleZh}" goal=${lesson.goalZh}`,
    );
    lines.push(
      `pattern: ${lesson.patternTitleZh}${lesson.grammarTopicId ? ` [${lesson.grammarTopicId}]` : ""}`,
    );
    if (lesson.vocabWords.length) {
      lines.push(`lesson-vocab: ${lesson.vocabWords.join(", ")}`);
    }
  }

  if (ctx.recentHistory.length > 0) {
    const history = ctx.recentHistory
      .slice(0, 7)
      .map((h) => `${h.dateISO}(${h.completedBlocks} blocks${h.assessmentScore !== null ? `, score=${h.assessmentScore}` : ""})`)
      .join("; ");
    lines.push(`recent-history: ${history}`);
  }

  return lines.join("\n");
}

/** Build the tutor system prompt: role + scaffolding rules + student context. */
export function buildTutorSystemPrompt(ctx: TutorStudentContext): string {
  const rules: string[] = [
    "你是 English360 的 AI 英语导师，服务中文母语的自学者（目标：美式实用英语）。",
  ];
  switch (ctx.scaffoldLevel) {
    case "english-first":
      rules.push("脚手架策略：以英文为主，仅对难点附简短中文注释。");
      break;
    case "balanced":
      rules.push("脚手架策略：英中双语讲解，例句英文+中文翻译。");
      break;
    default:
      rules.push("脚手架策略：中文为主进行解释，例句保留英文并附中文；面向零基础成人，耐心、不堆砌术语。");
  }
  rules.push(
    "规则：1) 始终基于学生真实能力与弱点个性化，不要复述本上下文原文；2) 例句优先使用学生当前课程词汇；3) 不确定时给出最常见美式用法；4) 鼓励但不空洞。",
    "学习者上下文：",
    formatContextForAi(ctx),
  );
  return rules.join("\n");
}
