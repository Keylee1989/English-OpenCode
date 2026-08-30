import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import { paginateConversations } from "@/ai/conversation-store";
import type { ConversationRow } from "@/data/db";

beforeEach(async () => {
  await db.conversations.clear();
});

describe("conversation pagination (1000-row simulation)", () => {
  it("pages correctly over a large filtered history", { timeout: 40000 }, async () => {
    const rows: ConversationRow[] = [];
    for (let i = 0; i < 1000; i++) {
      rows.push({
        id: `c${i}`,
        createdAt: i,
        updatedAt: i,
        type: (i % 2 === 0 ? "tutor" : "roleplay") as ConversationRow["type"],
        messages: [],
        relatedDay: undefined,
        relatedKnowledgeIds: [],
      });
    }
    // Interleave updatedAt so ordering is verifiable: tutor rows get even stamps.
    await db.conversations.bulkPut(rows);

    const page1 = await paginateConversations({ type: "tutor", page: 1, pageSize: 50 });
    expect(page1.total).toBe(500);
    expect(page1.pageCount).toBe(10);
    expect(page1.rows).toHaveLength(50);
    // newest first
    expect(page1.rows[0].updatedAt).toBeGreaterThan(page1.rows[49].updatedAt);

    const page5 = await paginateConversations({ type: "tutor", page: 5, pageSize: 50 });
    expect(page5.rows).toHaveLength(50);
    const ids1 = new Set(page1.rows.map((r) => r.id));
    for (const r of page5.rows) expect(ids1.has(r.id)).toBe(false); // no overlap

    const beyond = await paginateConversations({ type: "tutor", page: 11, pageSize: 50 });
    expect(beyond.rows).toHaveLength(0);

    const roleplay = await paginateConversations({ type: "roleplay", page: 1, pageSize: 200 });
    expect(roleplay.total).toBe(500);
    expect(roleplay.rows.every((r) => r.type === "roleplay")).toBe(true);
  });
});
