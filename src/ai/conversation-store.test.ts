import { beforeEach, describe, expect, it } from "vitest";
import { DATA_TABLE_NAMES } from "@/data/db";
import {
  appendMessage,
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  updateRoleplayMeta,
} from "@/ai/conversation-store";

beforeEach(async () => {
  await import("@/data/db").then(({ db }) => db.conversations.clear());
});

describe("conversation store", () => {
  it("creates, appends and reads a tutor conversation", async () => {
    const row = await createConversation({
      type: "tutor",
      relatedDay: 95,
      initialMessages: [{ role: "user", content: "讲解一下虚拟语气" }],
    });
    await appendMessage(row.id, { role: "assistant", content: "好，先看例句…" });
    const loaded = await getConversation(row.id);
    expect(loaded?.type).toBe("tutor");
    expect(loaded?.relatedDay).toBe(95);
    expect(loaded?.messages).toHaveLength(2);
    expect(loaded?.messages[1].role).toBe("assistant");
    expect(loaded!.updatedAt).toBeGreaterThanOrEqual(loaded!.createdAt);
  });

  it("lists newest-first and filters by type", async () => {
    await createConversation({ type: "tutor" });
    
    await new Promise((r) => setTimeout(r, 5));
    await createConversation({ type: "roleplay" });
    await new Promise((r) => setTimeout(r, 5));
    await createConversation({ type: "tutor" });

    const all = await listConversations({});
    expect(new Set([all[2].id, all[1].id, all[0].id]).size).toBe(3);
    expect(all[0].updatedAt).toBeGreaterThanOrEqual(all[2].updatedAt);

    const tutors = await listConversations({ type: "tutor" });
    expect(tutors.every((r) => r.type === "tutor")).toBe(true);
    expect(tutors).toHaveLength(2);
  });

  it("deletes a conversation", async () => {
    const row = await createConversation({ type: "dialogue" });
    await deleteConversation(row.id);
    expect(await getConversation(row.id)).toBeNull();
  });

  it("updates roleplay meta without touching messages", async () => {
    const row = await createConversation({
      type: "roleplay",
      initialMessages: [{ role: "assistant", content: "Hi! Table for two?" }],
    });
    await updateRoleplayMeta(row.id, {
      scenarioId: "restaurant",
      userRole: "customer",
      aiRole: "server",
      turn: 1,
      difficulty: "normal",
    });
    const loaded = await getConversation(row.id);
    expect(loaded?.meta?.scenarioId).toBe("restaurant");
    expect(loaded?.meta?.turn).toBe(1);
    expect(loaded?.messages).toHaveLength(1);
  });

  it("is included in export/import table list (backup coverage)", () => {
    expect(DATA_TABLE_NAMES).toContain("conversations");
  });
});
