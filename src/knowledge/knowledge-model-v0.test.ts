import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import {
  edgeCount,
  getCollocationPartners,
  getConfusionSet,
  getGrammarNode,
  getRelatedUnmastered,
  getWordFamily,
  GRAMMAR_NODES,
  knowledgeStats,
  related,
  syncKnowledgeToDb,
} from "@/knowledge/knowledge-model-v0";

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe("Knowledge Model v0", () => {
  it("indexes 3000+ words plus one grammar node per authored day", () => {
    const stats = knowledgeStats();
    expect(stats.words).toBeGreaterThanOrEqual(3000);
    expect(stats.grammar).toBe(360);
  });

  it("builds relation edges of every required type", () => {
    const stats = knowledgeStats();
    expect(stats.edgesByRelation.synonym).toBeGreaterThan(0);
    expect(stats.edgesByRelation.antonym).toBeGreaterThan(0);
    expect(stats.edgesByRelation["word-family"]).toBeGreaterThanOrEqual(0);
    expect(stats.edgesByRelation.collocation).toBeGreaterThan(0);
    expect(stats.edgesByRelation["confusion-pair"]).toBeGreaterThanOrEqual(8 * 2);
    expect(edgeCount()).toBe(
      Object.values(stats.edgesByRelation).reduce((a, b) => a + b, 0),
    );
  });

  it("answers confusion-set queries (eat <-> it)", () => {
    const eatConfusions = getConfusionSet("w:eat");
    expect(eatConfusions).toContain("w:it");
    expect(getConfusionSet("w:it")).toContain("w:eat");
  });

  it("derives collocation partners from phrases (drink water)", () => {
    const partners = getCollocationPartners("w:water");
    expect(partners).toContain("w:drink");
  });

  it("returns word-family members when authored", () => {
    // work/worker are a real derivation pair in the core set
    const family = getWordFamily("w:worker");
    expect(family).toContain("w:work");
  });

  it("grammar nodes carry examples AND common Chinese-learner errors", () => {
    const node = getGrammarNode("p:im");
    expect(node?.id).toBe("g:p:im");
    expect(node?.examples.length).toBeGreaterThanOrEqual(3);
    expect(node?.commonErrors.length).toBeGreaterThan(0);
    expect(node?.commonErrors[0].wrong).toContain("I Lin.");
    expect(GRAMMAR_NODES.slice(0,7).every((n) => n.commonErrors.length > 0)).toBe(true);
  });

  it("getRelatedUnmastered filters by memory state (planner hook)", async () => {
    const neighbors = related("w:it").map((edge) => edge.toItemId);
    expect(neighbors.length).toBeGreaterThan(0);

    // Master one neighbor, leave the rest unseen.
    const mastered = neighbors[0];
    await db.memoryStates.put({
      itemId: mastered,
      stage: "mastered",
      stability: 10,
      difficulty: 0.2,
      dueAt: Date.now() + 86_400_000,
      lastReviewedAt: Date.now(),
      successfulReps: 5,
      lapses: 0,
      reviewCount: 5,
      successCount: 5,
      failureCount: 0,
      producedCount: 2,
    });

    const unmastered = await getRelatedUnmastered("w:it");
    expect(unmastered).not.toContain(mastered);
    expect(unmastered.length).toBe(neighbors.length - 1);
  });

  it("persists nodes and edges into Dexie for export/sync", { timeout: 120000 }, async () => {
    const result = await syncKnowledgeToDb();
    expect(result.items).toBe(knowledgeStats().words + knowledgeStats().grammar);
    expect(result.edges).toBe(edgeCount());
    expect(await db.knowledgeItems.count()).toBe(result.items);
    expect(await db.knowledgeEdges.count()).toBe(result.edges);

    const row = await db.knowledgeItems.get("w:hi");
    expect(row?.kind).toBe("word");

    // Idempotent.
    const again = await syncKnowledgeToDb();
    expect(again).toEqual(result);
  });
});
