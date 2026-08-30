import { describe, expect, it } from "vitest";
import { getDayContent } from "@/content";
import {
  buildAssessmentExercises,
  buildPracticeExercises,
  interactionFor,
} from "@/study/generate-exercises";
import { gradeExercise, normalizeText } from "@/study/grade";
import type { Exercise, ExerciseAnswer } from "@/study/exercise-types";

const day1 = getDayContent(1);
if (!day1) throw new Error("Day 1 content missing");

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

describe("exercise generation", () => {
  it("is deterministic for identical options", () => {
    const a = JSON.stringify(buildPracticeExercises(day1, { audioAvailable: false }));
    const b = JSON.stringify(buildPracticeExercises(day1, { audioAvailable: false }));
    expect(a).toBe(b);
  });

  it("never emits audio-dependent exercises when audio is unavailable", () => {
    const exercises = buildPracticeExercises(day1, { audioAvailable: false });
    const assessment = buildAssessmentExercises(day1, { audioAvailable: false });
    for (const exercise of [...exercises, ...assessment]) {
      expect(exercise.requiresAudio ?? false).toBe(false);
      expect(exercise.type).not.toBe("mcq-listening-word");
      expect(exercise.type).not.toBe("listen-judge");
      expect(exercise.type).not.toBe("shadowing");
    }
  });

  it("includes listening and shadowing only with audio support", () => {
    const exercises = buildPracticeExercises(day1, { audioAvailable: true });
    expect(exercises.some((exercise) => exercise.type === "mcq-listening-word")).toBe(true);
    expect(exercises.some((exercise) => exercise.type === "listen-judge")).toBe(true);
    expect(exercises.some((exercise) => exercise.type === "shadowing")).toBe(true);
  });

  it("covers recognition, recall and production in practice sets", () => {
    const exercises = buildPracticeExercises(day1, { audioAvailable: false });
    const types = new Set(exercises.map((exercise) => exercise.type));
    expect(types.has("mcq-meaning")).toBe(true);
    expect(types.has("mcq-reverse")).toBe(true);
    expect(types.has("recall-type")).toBe(true);
    expect(types.has("fill-blank")).toBe(true);
    expect(types.has("sentence-order")).toBe(true);
  });

  it("maps every exercise type to skill + interaction consistently", () => {
    const exercises = buildPracticeExercises(day1, { audioAvailable: true });
    for (const exercise of exercises) {
      const mapping = interactionFor(exercise.type);
      expect(mapping.skill).toBeTruthy();
      expect(mapping.interaction.length).toBeGreaterThan(0);
    }
  });

  it("grades every exercise correctly when answered correctly", () => {
    const all = [
      ...buildPracticeExercises(getDayContent(3)!, { audioAvailable: true }),
      ...buildAssessmentExercises(getDayContent(5)!, { audioAvailable: true }),
    ];
    for (const exercise of all) {
      expect(gradeExercise(exercise, correctAnswerFor(exercise)).correct).toBe(true);
    }
  });
});

describe("grading rules", () => {
  it("normalizes typed answers (case, spaces, punctuation)", () => {
    expect(normalizeText("  I'M   LIN. ")).toBe("i'm lin");
    expect(normalizeText("Hello!")).toBe("hello");
    const fill = buildPracticeExercises(day1, { audioAvailable: false }).find(
      (exercise) => exercise.type === "fill-blank",
    );
    if (!fill || fill.type !== "fill-blank") throw new Error("no fill-blank generated");
    expect(
      gradeExercise(fill, { kind: "text", text: `  ${fill.answer.toUpperCase()} ` }).correct,
    ).toBe(true);
  });

  it("judges listen-judge semantics on both branches", () => {
    const same: Exercise = {
      id: "t-lj-0",
      type: "listen-judge",
      skill: "listening",
      requiresAudio: true,
      speakText: "Hi!",
      displaySentence: "Hi!",
      isSame: true,
      zh: "嗨",
    };
    const different: Exercise = { ...same, id: "t-lj-1", isSame: false };
    expect(gradeExercise(same, { kind: "yes" }).correct).toBe(true);
    expect(gradeExercise(same, { kind: "no" }).correct).toBe(false);
    expect(gradeExercise(different, { kind: "no" }).correct).toBe(true);
    expect(gradeExercise(different, { kind: "yes" }).correct).toBe(false);
  });

  it("marks shadowing self-reports as attempted but never as scored output", () => {
    const shadow: Exercise = {
      id: "t-sh-0",
      type: "shadowing",
      skill: "speaking",
      requiresAudio: true,
      speakText: "Hi, I'm Lin.",
      en: "Hi, I'm Lin.",
      zh: "嗨，我是林。",
    };
    expect(gradeExercise(shadow, { kind: "self-rated-unable" }).correct).toBe(true);
    expect(gradeExercise(shadow, { kind: "self-rated-able" }).correct).toBe(true);
  });

  it("rejects wrong answers of every shape", () => {
    const mcq: Exercise = {
      id: "t-m-0",
      type: "mcq-meaning",
      skill: "vocabulary",
      itemId: "w:hi",
      wordEn: "hi",
      optionsZh: ["再见", "你好", "谢谢"],
      answerIndex: 1,
      explainZh: "",
    };
    expect(gradeExercise(mcq, { kind: "choice", index: 1 }).correct).toBe(true);
    expect(gradeExercise(mcq, { kind: "choice", index: 0 }).correct).toBe(false);

    const order: Exercise = {
      id: "t-o-0",
      type: "sentence-order",
      skill: "grammar",
      tokens: ["Lin.", "I'm", "Hi,"],
      answer: "Hi, I'm Lin.",
      zh: "",
    };
    expect(gradeExercise(order, { kind: "tokens", order: [2, 1, 0] }).correct).toBe(true);
    expect(gradeExercise(order, { kind: "tokens", order: [0, 1, 2] }).correct).toBe(false);
  });
});
