/**
 * PHASE 1 REQUIRED TEST 1 - complete Day 1 end-to-end (headless, mirrors the
 * exact UI flow in StudyPage):
 *   learn -> practice -> assessment -> record -> model update -> SRS schedule
 */
import { beforeEach, describe, expect, it } from "vitest";
import { DAY_CONTENT, getDayContent } from "@/content";
import { db } from "@/data/db";
import { track } from "@/data/recorder";
import {
  applyReview,
  getDueCards,
  introduceItem,
} from "@/engines/memory/memory-engine-v0";
import { buildPlan, todayISO } from "@/engines/planner/planner-v0";
import {
  ensureDailySession,
  completeDay,
  finishDailySession,
  markLessonDone,
} from "@/study/session";
import {
  buildAssessmentExercises,
  buildPracticeExercises,
  interactionFor,
  isProductionType,
} from "@/study/generate-exercises";
import { gradeExercise } from "@/study/grade";
import type { Exercise, ExerciseAnswer } from "@/study/exercise-types";

const NOW = Date.now();
const DAY = 86_400_000;

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
});

function correctAnswerFor(exercise: Exercise): ExerciseAnswer {
  switch (exercise.type) {
    case "mcq-meaning":
    case "mcq-reverse":
    case "mcq-listening-word":
    case "grammar-correct":
    case "reading-comprehension":
      return { kind: "choice", index: exercise.answerIndex };
    case "phonics-discriminate":
      return { kind: "choice", index: exercise.answerIndex };
    case "fill-blank":
    case "recall-type":
      return { kind: "text", text: exercise.answer };
    case "sentence-order":
      return {
        kind: "tokens",
        order: exercise.answer.split(" ").map((word) => exercise.tokens.indexOf(word)),
      };
    case "listen-judge":
      return { kind: exercise.isSame ? "yes" : "no" };
    case "shadowing":
      return { kind: "self-rated-able" };
    case "translate-zh-en":
      return { kind: "text", text: exercise.modelAnswer };
    case "guided-production":
      return { kind: "production-matched" };
  }
}

function wrongAnswerFor(exercise: Exercise): ExerciseAnswer {
  switch (exercise.type) {
    case "mcq-meaning":
      return {
        kind: "choice",
        index: (exercise.answerIndex + 1) % exercise.optionsZh.length,
      };
    case "mcq-reverse":
    case "mcq-listening-word":
      return {
        kind: "choice",
        index: (exercise.answerIndex + 1) % exercise.optionsEn.length,
      };
    case "grammar-correct":
    case "reading-comprehension":
      return { kind: "choice", index: (exercise.answerIndex + 1) % exercise.optionsEn.length };
    case "phonics-discriminate":
      return { kind: "choice", index: exercise.answerIndex === 0 ? 1 : 0 };
    case "fill-blank":
    case "recall-type":
      return { kind: "text", text: "__wrong__" };
    case "sentence-order":
      return {
        kind: "tokens",
        order: exercise.tokens.map((_, index) => exercise.tokens.length - 1 - index),
      };
    case "listen-judge":
      return { kind: exercise.isSame ? "no" : "yes" };
    case "shadowing":
      return { kind: "self-rated-unable" };
    case "translate-zh-en":
      return { kind: "text", text: "__wrong__" };
    case "guided-production":
      return { kind: "production-off" };
  }
}

describe("Phase 1 required test 1: completing Day 1", () => {
  it("records events, moves the ability model, and schedules tomorrow's reviews", async () => {
    const day1 = getDayContent(1);
    if (!day1) throw new Error("missing day 1");
    const dateISO = todayISO(NOW);

    // ---- Session opens (home -> start learning) ----
    await ensureDailySession(dateISO);

    // ---- Lesson: teach each word, register it in memory ----
    for (const entry of day1.vocab) {
      await track({
        skill: "vocabulary",
        interaction: "learn-new",
        itemId: entry.id,
        correct: null,
        difficulty: entry.difficulty,
      });
      await introduceItem(entry.id, entry.difficulty, NOW);
    }
    await markLessonDone(1);

    // ---- Practice: run the generated set; every attempt on the FIRST word
    // ("w:hi") is deliberately failed so its memory state is deterministic:
    // last outcome = failure -> short retry interval. ----
    const practice = buildPracticeExercises(day1, { audioAvailable: false });
    const FAILED_ITEM_ID = day1.vocab[0].id;
    let failedAttempts = 0;

    let practiceGraded = 0;
    for (const exercise of practice) {
      const mapping = interactionFor(exercise.type);
      const itemId = "itemId" in exercise ? exercise.itemId : undefined;
      const isPlannedFailure = itemId === FAILED_ITEM_ID;
      if (isPlannedFailure) failedAttempts += 1;
      const answer: ExerciseAnswer = isPlannedFailure
        ? wrongAnswerFor(exercise)
        : correctAnswerFor(exercise);
      const graded = gradeExercise(exercise, answer);
      expect(graded.correct).not.toBeNull();
      practiceGraded += 1;

      await track({
        skill: mapping.skill,
        interaction: mapping.interaction,
        itemId,
        correct: graded.correct,
        difficulty: 0.4,
        production: isProductionType(exercise.type),
        errorCategory: graded.correct ? undefined : `${mapping.skill}-mistake`,
        errorDescriptionZh: graded.correct ? undefined : "练习答错（集成测试）",
      });
      if (itemId) {
        await applyReview({
          itemId,
          grade: graded.correct ? 1 : 0,
          production: isProductionType(exercise.type),
          nowMs: NOW,
        });
      }
    }

    // ---- Assessment: all correct, like a strong learner ----
    const assessment = buildAssessmentExercises(day1, { audioAvailable: false });
    let correctCount = 0;
    for (const exercise of assessment) {
      const mapping = interactionFor(exercise.type);
      const itemId = "itemId" in exercise ? exercise.itemId : undefined;
      const isPlannedFailure = itemId === FAILED_ITEM_ID;
      if (isPlannedFailure) failedAttempts += 1;
      const graded = gradeExercise(
        exercise,
        isPlannedFailure ? wrongAnswerFor(exercise) : correctAnswerFor(exercise),
      );
      if (graded.correct) correctCount += 1;
      await track({
        skill: mapping.skill,
        interaction: mapping.interaction,
        itemId,
        correct: graded.correct,
        difficulty: 0.4,
        production: isProductionType(exercise.type),
      });
      if (itemId) {
        await applyReview({
          itemId,
          grade: graded.correct ? 1 : 0,
          production: isProductionType(exercise.type),
          nowMs: NOW,
        });
      }
    }
    const score = Math.round((correctCount / assessment.length) * 100);

    // ---- Close out the day ----
    await completeDay(1, score);
    await finishDailySession(dateISO);

    // ================= Assertions =================

    // 1) Learning events were saved.
    const events = await db.learningEvents.toArray();
    const learnNew = events.filter((event) => event.interaction === "learn-new");
    expect(learnNew.map((event) => event.itemId).sort()).toEqual(
      day1.vocab.map((entry) => entry.id).sort(),
    );
    expect(events.length).toBeGreaterThan(day1.vocab.length + practiceGraded);

    // 2) The Student Model changed - vocabulary & grammar have real evidence.
    const vocabAbility = await db.abilities.get("vocabulary");
    expect(vocabAbility).toBeDefined();
    expect(vocabAbility?.evidenceCount).toBeGreaterThanOrEqual(day1.vocab.length);
    expect(vocabAbility?.score).toBeGreaterThan(0);
    expect(vocabAbility?.confidence).toBeGreaterThan(0);
    const grammarAbility = await db.abilities.get("grammar");
    expect(grammarAbility?.evidenceCount).toBeGreaterThanOrEqual(2);

    // 3) SRS generated review tasks: every day-1 word has memory state...
    for (const entry of day1.vocab) {
      const state = await db.memoryStates.get(entry.id);
      expect(state).toBeDefined();
      expect(state?.reviewCount).toBeGreaterThanOrEqual(1);
    }
    // ...and the repeatedly-failed item is flagged for near-term retry:
    // every attempt failed, so its final interval is the minimum floor.
    const failedState = await db.memoryStates.get(FAILED_ITEM_ID);
    expect(failedState?.failureCount).toBe(failedAttempts);
    expect(failedAttempts).toBeGreaterThanOrEqual(1);
    expect(failedState?.successCount).toBe(0);
    expect(failedState?.dueAt).toBeLessThan(NOW + DAY);

    // Tomorrow's queue contains today's material, including the failed word.
    const tomorrow = await getDueCards(NOW + DAY + 60_000);
    expect(tomorrow.length).toBeGreaterThanOrEqual(1);
    expect(tomorrow.some((card) => card.state.itemId === FAILED_ITEM_ID)).toBe(true);

    // 4) Day progress + daily session closed out.
    const progress = await db.dayProgress.get(1);
    expect(progress?.status).toBe("completed");
    expect(typeof progress?.score).toBe("number");
    const session = await db.dailySessions.get(dateISO);
    expect(session?.endedAt).not.toBeNull();

    // Errors landed in the Error Bank.
    expect((await db.errors.toArray()).length).toBeGreaterThanOrEqual(1);

    // 5) The next day knows what to do: review first, then Day 2 lesson.
    const plan2 = await buildPlan(NOW + DAY);
    expect(plan2.currentDay).toBe(2);
    expect(plan2.blocks[0]?.kind).toBe("review");
    // Phase 3b: planner may add remedial cards after our snapshot was taken,
    // so assert internal consistency rather than a frozen count.
    const reviewBlock = plan2.blocks[0];
    const reviewDue =
      reviewBlock?.kind === "review" ? reviewBlock.dueCount : 0;
    expect(reviewDue).toBe(plan2.dueCards.length);
    const lesson2 = plan2.blocks.find((block) => block.kind === "lesson");
    expect(lesson2?.kind === "lesson" ? lesson2.day : null).toBe(2);

    // 6) All authored days remain reachable afterwards (Phase 23: 360 days).
    expect(DAY_CONTENT).toHaveLength(360);
  });
});
