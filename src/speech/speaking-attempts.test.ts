import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import {
  deleteAttempt,
  getAttempt,
  listAttempts,
  saveAttempt,
  setSelfReview,
} from "@/speech/speaking-attempts";

function fakeBlob(): Blob {
  return new Blob(["fake-audio-bytes"], { type: "audio/webm" });
}

beforeEach(async () => {
  await db.speakingAttempts.clear();
  await db.conversations.clear();
});

describe("speaking attempts store", () => {
  it("saves an attempt linked to its conversation and reads it back", async () => {
    const convo = await db.conversations.add({
      id: "rp1",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      type: "roleplay",
      messages: [],
      relatedKnowledgeIds: [],
    });
    void convo;
    const row = await saveAttempt({
      conversationId: "rp1",
      promptEn: "Welcome! Table for two?",
      audio: fakeBlob(),
    });
    expect(row.id).toBeTruthy();
    expect(row.selfScore).toBeNull(); // no auto scoring, ever
    const loaded = await getAttempt(row.id);
    expect(loaded?.conversationId).toBe("rp1");
    expect(loaded?.promptEn).toContain("Table for two");
    expect(loaded?.audio).toBeTruthy(); // Blob survives the round-trip
  });

  it("lists by conversation, newest first", async () => {
    await saveAttempt({ conversationId: "rpX", promptEn: "a", audio: fakeBlob(), selfScore: 3 });
    await new Promise((r) => setTimeout(r, 5));
    await saveAttempt({ conversationId: "rpX", promptEn: "b", audio: fakeBlob(), selfScore: 4 });
    const rows = await listAttempts("rpX");
    expect(rows).toHaveLength(2);
    expect(rows[0].createdAt).toBeGreaterThanOrEqual(rows[1].createdAt);
  });

  it("attaches a self-review (the ONLY scoring path)", async () => {
    const row = await saveAttempt({ conversationId: "rpY", promptEn: "p", audio: fakeBlob() });
    await setSelfReview(row.id, 4, "rhythm felt off");
    const stored = await getAttempt(row.id);
    expect(stored?.selfScore).toBe(4);
    expect(stored?.note).toBe("rhythm felt off");
  });

  it("deletes an attempt", async () => {
    const row = await saveAttempt({ conversationId: "c1", promptEn: "p", audio: fakeBlob() });
    await deleteAttempt(row.id);
    expect(await getAttempt(row.id)).toBeNull();
  });

  it("clamps invalid self-scores to the 1..5 range", async () => {
    const row = await saveAttempt({ conversationId: "c2", promptEn: "p", audio: fakeBlob(), selfScore: 99 });
    expect(row.selfScore).toBe(5);
  });
});
