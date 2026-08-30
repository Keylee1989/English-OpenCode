/**
 * Learning Validation Mode - optional AI gap-fill grading (Phase 20 P1).
 *
 * The learner fills a blanked English sentence; when a provider is configured
 * the AI grades each fill as correct/incorrect in ONE strict-JSON batch call.
 * Everything degrades honestly: malformed JSON yields ok:false per item and the
 * caller falls back to learner self-check (it never fabricates a score).
 */
import type { IAiProvider } from "@/ai/provider";
import { chat } from "@/ai/tutor-service";

export interface GapFillGraded {
  /** 0-based index back into the submitted items. */
  index: number;
  correct: boolean;
}

export function parseGapFillGrades(raw: string): GapFillGraded[] | null {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-z]*\n?/, "").replace(/```\s*$/, "").trim();
  }
  try {
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) return null;
    const grades: GapFillGraded[] = [];
    for (const el of arr) {
      if (el && typeof el.index === "number" && typeof el.correct === "boolean") {
        grades.push({ index: el.index, correct: el.correct });
      }
    }
    return grades.length === 0 ? null : grades;
  } catch {
    return null;
  }
}

async function gradeBatch(
  provider: IAiProvider,
  payload: string,
  signal?: AbortSignal,
): Promise<GapFillGraded[] | null> {
  const reply = await chat(
    provider,
    [
      {
        role: "system",
        content:
          "你是 English360 的写作填空评测器，面向零基础中文成人。\n" +
          'Return STRICT JSON only, an array: [{"index":0,"correct":true}, ...], one entry per provided item.\n' +
          "correct 仅在答案与下划线缺失词真义相符时为 true（同义替换亦算对，忽略大小写）。",
      },
      { role: "user", content: payload },
    ],
    { temperature: 0.2, signal, feature: "lvm-gapfill" },
  );
  return parseGapFillGrades(reply.content);
}

/**
 * Grades every gap-fill item. On any request/parse failure returns null;
 * the caller then degrades to learner self-check (no partial fabricated pass).
 */
export async function gradeAllGapFills(
  provider: IAiProvider,
  gapItems: { index: number; sentence: string; answer: string; key: string }[],
  signal?: AbortSignal,
): Promise<GapFillGraded[] | null> {
  if (gapItems.length === 0) return [];
  const payload = gapItems
    .map(
      (g) =>
        `#${g.index} 句子：${g.sentence}\n学生答案：${g.answer}\n（缺失词原词：${g.key}，仅作对照，不用于判定同义）`,
    )
    .join("\n\n");
  const grades = await gradeBatch(provider, payload, signal);
  if (!grades) return null;
  // Reject partial/bogus responses (defensive; never fabricate).
  const idx = new Set(grades.map((g) => g.index));
  if (!gapItems.every((g) => idx.has(g.index))) return null;
  return grades;
}
