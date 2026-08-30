/**
 * Pure grading functions for every exercise type. No IO, fully testable.
 */
import type { Exercise, ExerciseAnswer, GradeResult } from "@/study/exercise-types";

/** Normalize typed answers: case, whitespace, curly quotes, final punctuation. */
export function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[.!?、，。]+$/u, "")
    .replace(/\s+/g, " ");
}

export function gradeExercise(exercise: Exercise, answer: ExerciseAnswer): GradeResult {
  switch (exercise.type) {
    case "mcq-meaning":
    case "mcq-reverse":
    case "mcq-listening-word":
    case "phonics-discriminate":
    case "grammar-correct":
    case "reading-comprehension": {
      if (answer.kind !== "choice") return { correct: false };
      return { correct: answer.index === exercise.answerIndex };
    }
    case "translate-zh-en": {
      if (answer.kind !== "text") return { correct: false };
      const attempt = normalizeText(answer.text);
      return {
        correct: exercise.acceptedAnswers.some(
          (accepted) => normalizeText(accepted) === attempt,
        ),
      };
    }
    case "listen-judge": {
      if (answer.kind === "yes") return { correct: exercise.isSame };
      if (answer.kind === "no") return { correct: !exercise.isSame };
      return { correct: false };
    }
    case "fill-blank":
    case "recall-type": {
      if (answer.kind !== "text") return { correct: false };
      return { correct: normalizeText(answer.text) === normalizeText(exercise.answer) };
    }
    case "sentence-order": {
      if (answer.kind !== "tokens") return { correct: false };
      const attempt = answer.order.map((i) => exercise.tokens[i]).join(" ");
      return { correct: normalizeText(attempt) === normalizeText(exercise.answer) };
    }
    case "shadowing": {
      // Self-reported shadowing is honest evidence about willingness/attempt;
      // it is graded as attempted (true) but tracked with low self-report
      // weight - it must never count as free-speaking ability.
      const attempted = answer.kind === "self-rated-able" || answer.kind === "self-rated-unable";
      return { correct: attempted };
    }
    case "guided-production": {
      // Self-checked against the model answer - honest production attempt,
      // never auto-scored. Tracked with selfReport + production flags.
      const attempted =
        answer.kind === "production-matched" || answer.kind === "production-off";
      return { correct: attempted };
    }
  }
}

/** Convenience: did the learner actually produce language by typing/building? */
export function isProductionAnswer(answer: ExerciseAnswer): boolean {
  return answer.kind === "text" || answer.kind === "tokens";
}
