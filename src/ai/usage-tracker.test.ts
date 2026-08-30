import { beforeEach, describe, expect, it } from "vitest";
import { db, loadSettings, saveSettings } from "@/data/db";
import { DEFAULT_SETTINGS } from "@/core/types";
import {
  estimateTokens,
  getAiUsageLog,
  getAiUsageSummary,
  recordAiUsage,
} from "@/ai/usage-tracker";

describe("AI usage tracker (Phase 11-B)", () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it("records metadata only (no keys / no message content)", async () => {
    await recordAiUsage({
      provider: "openai-compatible",
      model: "gpt-test",
      timestamp: Date.now(),
      feature: "explanation",
      tokens: estimateTokens("abcd".repeat(10)),
      ok: true,
    });
    const log = await getAiUsageLog();
    expect(log).toHaveLength(1);
    const raw = JSON.stringify(await db.settings.get("ai-usage-log"));
    expect(raw).not.toContain("sk-");
    expect(raw.toLowerCase()).not.toContain("apikey");
    // The stored row must not carry any prompt/response text fields.
    // (durationMs only appears when the caller supplies it.)
    expect(Object.keys(log[0]).sort()).toEqual(
      [
        "feature",
        "id",
        "model",
        "ok",
        "provider",
        "retryCount",
        "timestamp",
        "tokens",
      ].sort(),
    );
  });

  it("aggregates per feature and model with ok/fail split", async () => {
    for (const ok of [true, true, false]) {
      await recordAiUsage({
        provider: "p",
        model: "m1",
        timestamp: Date.now(),
        feature: "writing-review",
        ok,
      });
    }
    await recordAiUsage({
      provider: "p",
      model: "m2",
      timestamp: Date.now(),
      feature: "dialogue",
      ok: true,
    });
    const summary = await getAiUsageSummary();
    expect(summary.total).toBe(4);
    expect(summary.ok).toBe(3);
    expect(summary.failed).toBe(1);
    expect(summary.byFeature[0]).toEqual({ feature: "writing-review", count: 3 });
    expect(summary.byModel[0].model).toBe("m1");
  });
});

describe("Beta Test Mode setting (Phase 11-C)", () => {
  beforeEach(async () => {
    await db.open();
    await db.settings.clear();
  });

  it("defaults to normal and persists an explicit beta-test opt-in", async () => {
    expect((await loadSettings()).studyMode).toBe("normal");
    await saveSettings({ ...DEFAULT_SETTINGS, studyMode: "beta-test" });
    expect((await loadSettings()).studyMode).toBe("beta-test");
    await saveSettings({ ...DEFAULT_SETTINGS, studyMode: "normal" });
    expect((await loadSettings()).studyMode).toBe("normal");
  });
});
