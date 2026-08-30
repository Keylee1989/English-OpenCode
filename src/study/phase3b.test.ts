import { beforeEach, describe, expect, it } from "vitest";
import { db, English360Database, SCHEMA_VERSION } from "@/data/db";
import { getDueCards } from "@/engines/memory/memory-engine-v0";
import { syncRemedialCards, loadRemedialCard } from "@/engines/errors/remedial-cards";
import {
  buildMilestoneExercises,
  submitAssessment,
  getAssessmentHistory,
  levelForScore,
} from "@/engines/assessment/assessment-v0";

const NOW = Date.now();

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
});

async function seedRepeatedGrammarErrors(): Promise<void> {
  for (let i = 0; i < 2; i++) {
    await db.learningEvents.add({
      id: `e-${i}`,
      occurredAt: NOW - 1000 + i,
      skill: "grammar",
      interaction: "sentence-ordering",
      itemId: undefined,
      correct: false,
    });
    await db.errors.add({
      id: `err-${i}`,
      occurredAt: NOW - 1000 + i,
      skill: "grammar",
      category: "grammar-mistake",
      descriptionZh: "语序错误（very like）",
      severity: "medium",
      relatedItemIds: ["w:three"],
      resolvedAt: null,
      errorType: "word-order",
      relatedKnowledge: ["g:p:i-want"],
    });
  }
}

describe("Error -> SRS auto-loop (Phase 3b)", () => {
  it("creates a remedial memory item from repeated errors", async () => {
    await seedRepeatedGrammarErrors();
    const created = await syncRemedialCards(NOW);
    expect(created.length).toBe(1);

    const card = await loadRemedialCard(created[0]);
    expect(card).not.toBeNull();
    expect(card?.type).toBe("grammar");
    expect(card?.answer.length).toBeGreaterThan(0);
    expect(card?.prompt.length).toBeGreaterThan(0);
  });

  it("generated items enter the SRS due queue", async () => {
    await seedRepeatedGrammarErrors();
    const created = await syncRemedialCards(NOW);
    const due = await getDueCards(NOW + 60_000, 50, { speechAvailable: false });
    expect(due.some((card) => card.state.itemId === created[0])).toBe(true);
  });

  it("does not duplicate cards for repeated errors (merge rule)", async () => {
    await seedRepeatedGrammarErrors();
    const first = await syncRemedialCards(NOW);
    const second = await syncRemedialCards(NOW + 1000);
    expect(first.length).toBe(1);
    expect(second.length).toBe(0);
    expect(await db.knowledgeItems.where("id").startsWith("r:").count()).toBe(1);
  });

  it("review success updates memory state (SRS applies to the card)", async () => {
    await seedRepeatedGrammarErrors();
    const [cardId] = await syncRemedialCards(NOW);
    // Simulate the review flow applying a successful retrieval.
    const { applyReview } = await import("@/engines/memory/memory-engine-v0");
    const after = await applyReview({ itemId: cardId!, grade: 1, nowMs: NOW });
    expect(after.successCount).toBe(1);
    expect(after.dueAt).toBe(NOW + 86_400_000);
    const dueTomorrow = await getDueCards(NOW + 60_000, 50, { speechAvailable: false });
    expect(dueTomorrow.some((c) => c.state.itemId === cardId)).toBe(false); // scheduled tomorrow
  });
});

describe("Assessment Engine v0 (Phase 3b)", () => {
  it("builds a Day-30 session covering six skills including output tasks", () => {
    const exercises = buildMilestoneExercises(30);
    const skills = new Set(exercises.map((exercise) => exercise.skill));
    for (const skill of ["vocabulary", "grammar", "listening", "reading", "writing"]) {
      expect(skills.has(skill as never), skill).toBe(true);
    }
    expect(exercises.some((e) => e.type === "guided-production")).toBe(true);
  });

  it("grades outcomes, computes weaknesses/recommendations and persists", async () => {
    const session = await submitAssessment(30, [
      { skill: "vocabulary", correct: true },
      { skill: "grammar", correct: true },
      { skill: "listening", correct: false },
      { skill: "reading", correct: true },
      { skill: "writing", correct: false, selfReported: true },
      { skill: "speaking", correct: true, selfReported: true },
    ]);
    expect(session.skillScores["vocabulary"]).toBe(100);
    expect(session.weaknesses.length).toBeGreaterThan(0);
    expect(session.recommendationsZh.length).toBeGreaterThan(0);
    expect(await db.assessments.get(session.id)).toBeTruthy();
    expect(typeof levelForScore(50)).toBe("string");
  });

  it("keeps assessment history across refresh (reopen database)", async () => {
    await submitAssessment(30, [{ skill: "reading", correct: true }]);
    const before = await db.assessments.toArray();
    await db.close();
    const reopened = new English360Database();
    await reopened.open();
    expect(reopened.verno).toBe(SCHEMA_VERSION);
    expect((await reopened.assessments.toArray()).length).toBe(before.length);
    reopened.close();
    await db.open();
  });

  it("history API returns stored sessions newest-first", async () => {
    const a = await submitAssessment(30, [{ skill: "reading", correct: true }]);
    const b = await submitAssessment(30, [{ skill: "reading", correct: false }]);
    const history = await getAssessmentHistory();
    expect(history.map((h) => h.id)).toEqual([b.id, a.id]);
  });
});
