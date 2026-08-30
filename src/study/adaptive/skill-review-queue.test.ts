import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import {
  resolveItemSkill,
  dueSkillCount,
} from "@/study/adaptive/skill-review-queue";
import { introduceItem } from "@/engines/memory/memory-engine-v0";

const T0 = 1_700_000_000_000;

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe("resolveItemSkill", () => {
  it("maps a plain lexical id to vocabulary with a title", async () => {
    // 'run' exists in the lexical bank.
    const r = await resolveItemSkill("w:run");
    expect(r.skill).toBe("vocabulary");
  });

  it("maps phonics remedial cards to phonics", async () => {
    const card = {
      id: "r:phonics-confusion:ship-sheep",
      sourceErrorId: "e1",
      knowledgeId: "ship-sheep",
      type: "phonics" as const,
      prompt: "听辨 ship/sheep",
      answer: "ship",
      explanationZh: "min pair",
      difficulty: 0.4,
      createdAt: T0,
    };
    await db.knowledgeItems.put({ id: card.id, kind: "remedial", data: card });
    const r = await resolveItemSkill("r:phonics-confusion:ship-sheep");
    expect(r.skill).toBe("phonics");
  });

  it("maps grammar remedial cards to grammar", async () => {
    const card = {
      id: "r:word-order:g:past-perfect",
      sourceErrorId: "e2",
      knowledgeId: "g:past-perfect",
      type: "grammar" as const,
      prompt: "句型纠正",
      answer: "had finished",
      explanationZh: "past perfect",
      difficulty: 0.45,
      createdAt: T0,
    };
    await db.knowledgeItems.put({ id: card.id, kind: "remedial", data: card });
    const r = await resolveItemSkill("r:word-order:g:past-perfect");
    expect(r.skill).toBe("grammar");
  });
});

describe("dueSkillCount", () => {
  it("counts due items by skill", async () => {
    await introduceItem("w:run", 0.2, T0);
    await introduceItem("w:cat", 0.2, T0);
    const counts = await dueSkillCount(T0);
    const vocab = counts.find((c) => c.skill === "vocabulary");
    expect(vocab?.dueCount).toBeGreaterThanOrEqual(2);
  });
});
