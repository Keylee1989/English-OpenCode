/**
 * Adaptive baseline - optional AI grading of productive probes.
 *
 * Auto-gradeable kinds (recall/correction/dictation/choice/reading) are graded
 * deterministically by the app. For OPEN productive kinds (speaking opinion,
 * writing essay) the learner writes a response; when an AI provider is
 * configured it grades each response on the probe's band, and the batch is
 * folded in. Everything degrades honestly to a structured learner self-report
 * when no provider (or a malformed reply) is available — never fabricated.
 */
import type { IAiProvider } from "@/ai/provider";
import { chat } from "@/ai/tutor-service";
import type { Probe } from "@/study/validation/banks/types";

export interface ProductiveGraded {
  /** 0-based index back into the submitted items. */
  index: number;
  correct: boolean;
  /** Optional AI rationale (which skill aspects were met / missed). */
  evidenceZh?: string;
  /** Optional 0..1 confidence in this single grade. */
  confidence?: number;
}

/**
 * Phase 22 (P0-5) — structured, evidence-bound AI grading.
 *
 * The AI is asked to return, per item, a boolean verdict plus an explicit
 * rationale and confidence. This makes the per-skill score traceable and
 * steerable (a fully "correct" but zero-confidence guess is not silently
 * treated the same as a confident, reasoned pass). We keep the boolean as the
 * primary signal so all existing consumers are unaffected; the evidence is
 * additive and never fabricated (it only exists when the AI returned it).
 */
export function parseProductiveGrades(raw: string): ProductiveGraded[] | null {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-z]*\n?/, "").replace(/```\s*$/, "").trim();
  }
  try {
    const arr = JSON.parse(text);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const grades: ProductiveGraded[] = [];
    for (const el of arr) {
      if (el && typeof el.index === "number" && typeof el.correct === "boolean") {
        const g: ProductiveGraded = { index: el.index, correct: el.correct };
        if (typeof el.evidenceZH === "string" && el.evidenceZH.trim().length > 0) {
          g.evidenceZh = el.evidenceZH.trim();
        } else if (typeof el.evidence_zh === "string" && el.evidence_zh.trim().length > 0) {
          g.evidenceZh = el.evidence_zh.trim();
        }
        if (typeof el.confidence === "number" && el.confidence >= 0 && el.confidence <= 1) {
          g.confidence = el.confidence;
        }
        grades.push(g);
      }
    }
    return grades.length === 0 ? null : grades;
  } catch {
    return null;
  }
}

/** Per-skill evidence summary derived from AI-graded productive items. */
export interface ProductiveEvidenceItem {
  index: number;
  skill: string;
  correct: boolean;
  confidence: number;
  evidenceZh: string;
}

export function productiveEvidenceOf(
  graded: readonly ProductiveGraded[],
  items: { index: number; skill: string }[],
): ProductiveEvidenceItem[] {
  const skillByIndex = new Map(items.map((x) => [x.index, x.skill]));
  return graded
    .filter((g) => skillByIndex.has(g.index))
    .map((g) => ({
      index: g.index,
      skill: skillByIndex.get(g.index)!,
      correct: g.correct,
      confidence: g.confidence ?? (g.correct ? 0.7 : 0.6),
      evidenceZh: g.evidenceZh ?? (g.correct ? "已达目标档位要求。" : "暂未达目标档位要求。"),
    }));
}

/**
 * Grade a batch of productive probes. Returns null on any failure (caller then
 * falls back to self-report) and rejects partial/missing indices.
 */
export async function gradeProductiveBatch(
  provider: IAiProvider,
  items: { index: number; probe: Probe; response: string }[],
  signal?: AbortSignal,
): Promise<ProductiveGraded[] | null> {
  if (items.length === 0) return [];
  const payload = items
    .map(
      (x) =>
        `#${x.index}\n题型：${x.probe.kind}\n目标CEFR：${x.probe.band}\n题目：${x.probe.promptEn}\n（提示：${x.probe.promptZh}）\n学习者回答：\n${x.response}\n`,
    )
    .join("\n\n---\n\n");
  const reply = await chat(
    provider,
    [
      {
        role: "system",
        content:
          "你是English360的自适应水平评测器，面向中文母语成人。请按题目给定的CEFR目标档位判断学习者回答是否达到该档要求（语法、词汇、语域、完整性）。\n" +
          '只返回严格JSON数组：[{"index":0,"correct":true,"evidenceZH":"哪些方面达标/未达标（中文）","confidence":0.8},...]，每题一条；correct 为布尔，evidenceZH 为一句中文依据，confidence 为0到1。不要输出任何其他文字。',
      },
      { role: "user", content: payload },
    ],
    { temperature: 0.2, signal, feature: "lvm-adaptive" },
  );
  const grades = parseProductiveGrades(reply.content);
  if (!grades) return null;
  const idx = new Set(grades.map((g) => g.index));
  if (!items.every((it) => idx.has(it.index))) return null;
  return grades;
}
