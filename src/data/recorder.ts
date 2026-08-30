/**
 * Learning Event recorder - the SINGLE entry point for study evidence.
 *
 * Every meaningful learner action flows through track():
 *  1. append to learningEvents (append-only evidence log)
 *  2. update the Student Model ability for that skill
 *  3. wrong answers with a category land in the Error Bank
 *
 * UI code must never write these tables directly.
 */
import { db, type LearningEventRow } from "@/data/db";
import { newId } from "@/core/ids";
import type { InteractionKind, SkillKey } from "@/core/types";
import * as studentModel from "@/engines/student/student-model-v0";
import { storeEnrichedError } from "@/engines/errors/error-analysis-v0";

export interface TrackInput {
  skill: SkillKey;
  interaction: InteractionKind;
  itemId?: string;
  correct: boolean | null;
  difficulty?: number;
  latencyMs?: number;
  /** Error Bank category when this is a wrong answer worth analyzing. */
  errorCategory?: string;
  errorDescriptionZh?: string;
  selfReported?: boolean;
  production?: boolean;
  meta?: Record<string, unknown>;
}

export async function track(input: TrackInput): Promise<string> {
  const id = newId();
  const row: LearningEventRow = {
    id,
    occurredAt: Date.now(),
    itemId: input.itemId,
    skill: input.skill,
    interaction: input.interaction,
    correct: input.correct,
    latencyMs: input.latencyMs,
    difficulty: input.difficulty,
    meta: {
      ...(input.meta ?? {}),
      ...(input.selfReported ? { selfReported: true } : {}),
      ...(input.production ? { production: true } : {}),
    },
  };
  await db.learningEvents.add(row);

  await studentModel.observe({
    id,
    occurredAt: row.occurredAt,
    itemId: input.itemId,
    skill: input.skill,
    interaction: input.interaction,
    correct: input.correct,
    latencyMs: input.latencyMs,
    difficulty: input.difficulty,
    meta: row.meta,
    selfReported: input.selfReported,
  });

  if (input.correct === false && input.errorCategory) {
    await storeEnrichedError(
      {
        occurredAt: row.occurredAt,
        skill: input.skill,
        category: input.errorCategory,
        descriptionZh:
          input.errorDescriptionZh ??
          `${input.skill} 练习答错（${input.interaction}）`,
        relatedItemIds: input.itemId ? [input.itemId] : [],
      },
      {
        category: input.errorCategory,
        skill: input.skill,
        interaction: input.interaction,
        itemId: input.itemId,
        answerText: typeof row.meta?.["answerText"] === "string" ? (row.meta["answerText"] as string) : undefined,
        grammarNodeId:
          typeof row.meta?.["grammarNodeId"] === "string"
            ? (row.meta["grammarNodeId"] as string)
            : undefined,
      },
    );
  }

  return id;
}
