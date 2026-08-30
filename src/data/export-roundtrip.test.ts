import { beforeEach, describe, expect, it } from "vitest";
import { db, DATA_TABLE_NAMES } from "@/data/db";
import {
  encodeRowAsync,
  exportAllData,
  importAllData,
} from "@/data/export-import";

/**
 * Phase 12 P0-3: in-vitest companion to scripts/check-export-integrity.cjs.
 *
 * Environment note: under vitest/happy-dom, fake-indexeddb's structured clone
 * degrades Blobs to plain objects at the DB layer - BEFORE export can run -
 * so binary fidelity is asserted by the .cjs gate running under Node's native
 * Blob. THIS file covers what holds everywhere:
 *   1) encodeRowAsync turns a Blob into a JSON-safe tagged data URL;
 *   2) clear -> import -> read restores every other table identically.
 */

describe("export/import round-trip (Phase 12 P0-3)", () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it("encodes Blobs as JSON-safe tagged data URLs", async () => {
    const blob = new Blob([new Uint8Array([9, 9, 9])], { type: "audio/webm" });
    const encoded = (await encodeRowAsync({
      id: "s1",
      audio: blob,
      meta: { nested: blob },
    })) as {
      id: string;
      audio: { __e360blob__?: boolean; dataUrl?: string };
      meta: { nested: { __e360blob__?: boolean; dataUrl?: string } };
    };

    expect(encoded.audio.__e360blob__).toBe(true);
    expect(encoded.audio.dataUrl).toMatch(/^data:audio\/webm;base64,/);
    // Nested blobs are encoded too.
    expect(encoded.meta.nested.dataUrl).toBe(encoded.audio.dataUrl);

    // The killer property: the encoded form survives a serialization boundary.
    const parsed = JSON.parse(JSON.stringify(encoded));
    expect(parsed.audio.dataUrl).toBe(encoded.audio.dataUrl);
  });

  it("restores conversations / assessments / memory / settings identically", async () => {
    await db.conversations.put({
      id: "c1",
      createdAt: 1,
      updatedAt: 2,
      type: "roleplay",
      messages: [
        { role: "assistant", content: "Hello!", noteZh: "你好！" },
        { role: "user", content: "Hi there." },
      ],
      relatedDay: 42,
      relatedKnowledgeIds: ["w:hi"],
      meta: {
        scenarioId: "restaurant-order",
        userRole: "customer",
        aiRole: "waiter",
        turn: 3,
        difficulty: "hard",
      },
    });
    await db.assessments.put({
      id: "a1",
      type: "milestone",
      day: 30,
      startedAt: 10,
      completedAt: 20,
      overallScore: 72,
      level: "中级 Intermediate",
      data: {
        skillScores: { vocabulary: 80 },
        weaknesses: ["listening"],
        recommendationsZh: ["多听"],
      },
    });
    await db.memoryStates.put({
      itemId: "w:hi",
      stage: "recalled",
      stability: 4,
      difficulty: 0.2,
      dueAt: 999,
      lastReviewedAt: 5,
      successfulReps: 3,
      lapses: 0,
      reviewCount: 3,
      successCount: 3,
      failureCount: 0,
      producedCount: 1,
    });
    await db.settings.bulkPut([
      { key: "app", value: { studyMode: "beta-test" } },
      {
        key: "ai-usage-log",
        value: [
          {
            id: "u1",
            provider: "p",
            model: "m",
            timestamp: 1,
            feature: "chat",
            tokens: 42,
            ok: true,
          },
        ],
      },
      {
        key: "beta-test-log",
        value: [{ id: "b1", ts: 1, kind: "drop-off", payload: { step: 2 } }],
      },
    ]);

    const before = await exportAllData({
      // This round-trip intentionally exercises the diagnostic logs too.
      includeAiUsageLog: true,
      includeBetaLog: true,
    });

    // Simulated data loss + restore through a real serialize boundary.
    await Promise.all(db.tables.map((table) => table.clear()));
    const summary = await importAllData(JSON.parse(JSON.stringify(before)));

    expect(summary.importedPerTable["conversations"]).toBe(1);
    expect(summary.importedPerTable["assessments"]).toBe(1);
    expect(summary.importedPerTable["memoryStates"]).toBe(1);

    const convo = await db.conversations.get("c1");
    expect(convo?.meta?.turn).toBe(3);
    expect(convo?.messages[0].noteZh).toBe("你好！");
    const assessment = await db.assessments.get("a1");
    expect(assessment?.overallScore).toBe(72);
    expect((await db.settings.get("ai-usage-log"))?.value).toEqual([
      { id: "u1", provider: "p", model: "m", timestamp: 1, feature: "chat", tokens: 42, ok: true },
    ]);
    expect((await db.settings.get("beta-test-log"))?.value).toEqual([
      { id: "b1", ts: 1, kind: "drop-off", payload: { step: 2 } },
    ]);

    // Every exported table must still exist post-restore.
    for (const name of DATA_TABLE_NAMES) {
      expect(db.table(name), name).toBeDefined();
    }
  });
});
