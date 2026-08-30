import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import {
  getSessionAiUsage,
  recordAiUsage,
} from "@/ai/usage-tracker";

/**
 * Phase 13 P0-4: session AI counter. SESSION_START is captured when the
 * module loads, so within a test process every recorded call is "in session".
 * These tests verify counting + failure split; window filtering by timestamp
 * is covered implicitly by the module-level boundary.
 */
describe("Session AI counter (Phase 13 P0-4)", () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it("starts at zero for a fresh session", async () => {
    const usage = await getSessionAiUsage();
    expect(usage).toEqual({ requests: 0, failedRequests: 0, estimatedTokens: 0 });
  });

  it("counts requests and estimated tokens after calls", async () => {
    await recordAiUsage({ provider: "p", model: "m", timestamp: Date.now(), feature: "explanation", tokens: 100, ok: true });
    await recordAiUsage({ provider: "p", model: "m", timestamp: Date.now(), feature: "roleplay", tokens: 250, ok: true });
    await recordAiUsage({ provider: "p", model: "m", timestamp: Date.now(), feature: "dialogue", ok: false });
    const usage = await getSessionAiUsage();
    expect(usage.requests).toBe(3);
    expect(usage.failedRequests).toBe(1);
    expect(usage.estimatedTokens).toBe(350);
  });
});
