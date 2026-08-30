/**
 * Error Analysis Engine v0 (spec §36, Phase 2).
 *
 * Every wrong answer recorded through the recorder gets enriched with:
 *   errorType / possibleCauseZh / relatedKnowledge / recommendedPractice
 *
 * Statistics answer three questions:
 *   - 高频错误: categories sorted by count
 *   - 重复错误: same category AND same item appearing 2+ times
 *   - 薄弱能力: skills whose recent graded accuracy < 60% (n >= 5)
 *
 * Remedial specs feed the Adaptive Planner's drill block.
 */
import { db } from "@/data/db";
import type { ErrorRecordRow } from "@/data/db";
import type { SkillKey } from "@/core/types";
import { newId } from "@/core/ids";
import { getConfusionSet } from "@/knowledge/knowledge-model-v0";
import { findLexical } from "@/content/vocab";
import { MINIMAL_PAIRS } from "@/phonics/rules";
import { recentAccuracy } from "@/engines/student/student-model-v0";
import {
  buildGrammarDrill,
  buildItemDrillExercises,
} from "@/study/generate-exercises";
import { buildPhonicsDrills } from "@/phonics/drills";
import type { Exercise } from "@/study/exercise-types";

// ---------------------------------------------------------------------------
// Taxonomy & classification
// ---------------------------------------------------------------------------

export type ErrorType =
  | "recognition-mismatch"
  | "recall-failure"
  | "spelling"
  | "word-order"
  | "listening-mishear"
  | "phonics-confusion";

export interface ClassifyInput {
  category: string;
  skill: string;
  interaction: string;
  itemId?: string;
  /** What the learner actually typed/built, when captured. */
  answerText?: string;
  /** Related grammar node id when the exercise carried one. */
  grammarNodeId?: string;
}

export interface ErrorEnrichment {
  errorType: ErrorType;
  possibleCauseZh: string;
  relatedKnowledge: string[];
  recommendedPracticeZh: string;
}

/** Minimal edit distance for spelling-vs-recall discrimination. */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

function pairIdForWord(itemId?: string): string | null {
  if (!itemId) return null;
  const entry = findLexical(itemId);
  if (!entry) return null;
  for (const pair of MINIMAL_PAIRS) {
    if (`w:${pair.aWord}` === entry.id || `w:${pair.bWord}` === entry.id) return pair.id;
  }
  return null;
}

/**
 * Pure classifier - unit-testable without any database.
 * Knowledge Model is consulted synchronously (static content graph).
 */
export function classifyError(input: ClassifyInput): ErrorEnrichment {
  const wordEntry = input.itemId ? findLexical(input.itemId) : null;
  let errorType: ErrorType;

  switch (input.interaction) {
    case "multiple-choice":
      errorType = "recognition-mismatch";
      break;
    case "recall":
    case "fill-blank":
    case "typing": {
      const target =
        wordEntry?.word ??
        (input.itemId && input.itemId.startsWith("g:") ? "" : "");
      const attempt = (input.answerText ?? "").trim().toLowerCase();
      errorType =
        target.length > 0 &&
        attempt.length > 0 &&
        levenshtein(attempt, target.toLowerCase()) <= 2 &&
        attempt !== target.toLowerCase()
          ? "spelling"
          : "recall-failure";
      break;
    }
    case "sentence-ordering":
      errorType = "word-order";
      break;
    case "listening": {
      const confused = input.itemId ? getConfusionSet(input.itemId) : [];
      errorType = confused.length > 0 ? "phonics-confusion" : "listening-mishear";
      break;
    }
    default:
      errorType = "recall-failure";
  }

  const relatedKnowledge: string[] = [];
  if (input.itemId) relatedKnowledge.push(...getConfusionSet(input.itemId));
  if (input.grammarNodeId) relatedKnowledge.push(input.grammarNodeId);

  const word = wordEntry?.word ?? "";
  let possibleCauseZh: string;
  let recommendedPracticeZh: string;
  switch (errorType) {
    case "recognition-mismatch":
      possibleCauseZh = word
        ? `对“${word}”的词义记忆还不牢固，选项间产生了混淆。`
        : "词义记忆不牢固，干扰项造成混淆。";
      recommendedPracticeZh = "看中文回忆英文（主动回忆），再看英文选中文巩固识别。";
      break;
    case "spelling":
      possibleCauseZh = `意思记得，但“${word}”的拼写差了一点（接近但不准确）。`;
      recommendedPracticeZh = `抄写并拼读 ${word}，然后用打字主动回忆 2 次。`;
      break;
    case "recall-failure":
      possibleCauseZh = word
        ? `看到中文想不起“${word}”，说明还停在“认识”阶段、没到“能输出”。`
        : "能认出来但主动输出失败。";
      recommendedPracticeZh = "增加中文→英文的打字回忆和造句练习。";
      break;
    case "word-order":
      possibleCauseZh = "句子结构（语序）还没内化，按中文顺序直译了。";
      recommendedPracticeZh = "多做连词成句，先跟读例句建立语感。";
      break;
    case "phonics-confusion": {
      const pairId = pairIdForWord(input.itemId);
      const pair = pairId ? MINIMAL_PAIRS.find((p) => p.id === pairId) : null;
      possibleCauseZh = pair
        ? `听音混淆：${pair.contrastZh}`
        : "相近发音辨析不足。";
      recommendedPracticeZh = pair
        ? `做最小对立听辨训练：${pair.aWord} vs ${pair.bWord}`
        : "重听示范音频并跟读对比。";
      break;
    }
    case "listening-mishear":
      possibleCauseZh = "听力输入跟不上：音素或连读识别不足。";
      recommendedPracticeZh = "慢速播放 + 跟读模仿，再回到常速听辨。";
      break;
  }

  return {
    errorType,
    possibleCauseZh,
    relatedKnowledge,
    recommendedPracticeZh,
  };
}

// ---------------------------------------------------------------------------
// Persistence (called by the recorder on every wrong answer)
// ---------------------------------------------------------------------------

export interface EnrichedErrorBase {
  occurredAt: number;
  skill: SkillKey | string;
  category: string;
  descriptionZh: string;
  relatedItemIds: string[];
}

/** Classify + persist one enriched error row. Returns the new row id. */
export async function storeEnrichedError(
  base: EnrichedErrorBase,
  input: ClassifyInput,
): Promise<string> {
  const enrichment = classifyError(input);
  const row: ErrorRecordRow = {
    id: newId(),
    occurredAt: base.occurredAt,
    skill: base.skill,
    category: base.category,
    descriptionZh: base.descriptionZh,
    severity: "medium",
    relatedItemIds: base.relatedItemIds,
    resolvedAt: null,
    errorType: enrichment.errorType,
    possibleCauseZh: enrichment.possibleCauseZh,
    relatedKnowledge: enrichment.relatedKnowledge,
    recommendedPracticeZh: enrichment.recommendedPracticeZh,
    answerText: input.answerText,
  };
  await db.errors.add(row);
  return row.id;
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export interface CategoryStat {
  category: string;
  count: number;
  lastAt: number;
  sampleZh: string;
  errorTypes: string[];
}

export interface ErrorStats {
  total: number;
  byCategory: CategoryStat[];
  repeatedCategories: string[];
  weakSkills: Array<{ skill: string; accuracy: number }>;
}

export async function getErrorStats(): Promise<ErrorStats> {
  const rows = await db.errors.toArray();
  const byCategoryMap = new Map<string, CategoryStat>();
  for (const row of rows) {
    const bucket = byCategoryMap.get(row.category) ?? {
      category: row.category,
      count: 0,
      lastAt: 0,
      sampleZh: row.descriptionZh,
      errorTypes: [],
    };
    bucket.count += 1;
    bucket.lastAt = Math.max(bucket.lastAt, row.occurredAt);
    if (!bucket.errorTypes.includes(row.errorType ?? "")) {
      bucket.errorTypes.push(row.errorType ?? "");
    }
    byCategoryMap.set(row.category, bucket);
  }
  const byCategory = [...byCategoryMap.values()].sort((a, b) => b.count - a.count);

  const repeatedCategories = byCategory.filter((stat) => stat.count >= 2).map((s) => s.category);

  // Weak skills from graded learning events.
  const weakSkills: Array<{ skill: string; accuracy: number }> = [];
  const skillSet = new Set(rows.map((row) => row.skill));
  for (const skill of skillSet) {
    const accuracy = await recentAccuracy(skill as SkillKey, 10);
    if (accuracy !== null && accuracy < 0.6) weakSkills.push({ skill, accuracy });
  }

  return { total: rows.length, byCategory, repeatedCategories, weakSkills };
}

export interface RepeatedErrorGroup {
  category: string;
  itemId: string;
  count: number;
}

/** 同类错误 + 同一知识点出现 >= minCount 次 → 判定为重复错误。 */
export async function detectRepeatedErrors(minCount = 2): Promise<RepeatedErrorGroup[]> {
  const rows = await db.errors.toArray();
  const map = new Map<string, RepeatedErrorGroup>();
  for (const row of rows) {
    const itemId = row.relatedItemIds[0];
    if (!itemId) continue;
    const key = `${row.category}|${itemId}`;
    const bucket = map.get(key) ?? { category: row.category, itemId, count: 0 };
    bucket.count += 1;
    map.set(key, bucket);
  }
  return [...map.values()]
    .filter((group) => group.count >= minCount)
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// Remedial specs -> exercises (consumed by the Adaptive Planner)
// ---------------------------------------------------------------------------

export type RemedialSpec =
  | { kind: "items"; category: string; itemIds: string[]; reasonZh: string }
  | { kind: "phonics"; category: string; pairIds: string[]; reasonZh: string }
  | { kind: "grammar"; category: string; grammarNodeId: string; reasonZh: string };

/** Build targeted drill specs from repeated errors + weak-skill signals. */
export async function getRemedialSpecs(limit = 3): Promise<RemedialSpec[]> {
  const repeated = await detectRepeatedErrors(2);
  const specs: RemedialSpec[] = [];

  for (const group of repeated) {
    const rows = await db.errors
      .where("category")
      .equals(group.category)
      .toArray();
    const mine = rows.filter((row) => row.relatedItemIds[0] === group.itemId);
    const errorTypes = new Set(mine.map((row) => row.errorType ?? ""));

    if (errorTypes.has("phonics-confusion")) {
      const pairId = pairIdForWord(group.itemId);
      if (pairId) {
        specs.push({
          kind: "phonics",
          category: group.category,
          pairIds: [pairId],
          reasonZh: `同一听辨点反复出错（${mine[0]?.descriptionZh ?? group.category} ×${group.count}）`,
        });
        continue;
      }
    }
    if (errorTypes.has("word-order") || errorTypes.has("recall-failure")) {
      const grammarNode = mine.find((row) => row.relatedKnowledge?.some((id) => id.startsWith("g:")))
        ?.relatedKnowledge?.find((id) => id.startsWith("g:"));
      if (grammarNode) {
        specs.push({
          kind: "grammar",
          category: group.category,
          grammarNodeId: grammarNode,
          reasonZh: `句型反复出错 ×${group.count}，安排专项结构训练`,
        });
        continue;
      }
    }
    const entry = findLexical(group.itemId);
    if (entry) {
      specs.push({
        kind: "items",
        category: group.category,
        itemIds: [group.itemId],
        reasonZh: `“${entry.word}”相关错误已重复 ${group.count} 次`,
      });
    }
    if (specs.length >= limit) break;
  }

  return specs.slice(0, limit);
}

/** Materialize remedial specs into runnable exercises. */
export function generateRemedialExercises(specs: readonly RemedialSpec[]): Exercise[] {
  const out: Exercise[] = [];
  for (const spec of specs) {
    switch (spec.kind) {
      case "items": {
        const entries = spec.itemIds
          .map((id) => findLexical(id))
          .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
        out.push(...buildItemDrillExercises(entries, spec.category));
        break;
      }
      case "phonics":
        out.push(...buildPhonicsDrills(spec.pairIds, 2));
        break;
      case "grammar":
        out.push(...buildGrammarDrill(spec.grammarNodeId.replace(/^g:/, "")));
        break;
    }
  }
  return out;
}
