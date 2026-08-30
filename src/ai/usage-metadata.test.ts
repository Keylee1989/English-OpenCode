import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import {
  getAiBudgetStatus,
  getAiFeatureStats,
  getAiUsageLog,
  recordAiUsage,
} from "@/ai/usage-tracker";

/**
 * Phase 14 P1-1: AI response metadata (durationMs / retryCount) and the
 * per-feature quality analysis built on top of it.
 */
describe("AI response metadata (Phase 14 P1-1)", () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it("stores durationMs and retryCount alongside the base metadata", async () => {
    await recordAiUsage({
      provider: "p",
      model: "m",
      timestamp: Date.now(),
      feature: "explanation",
      tokens: 120,
      durationMs: 1834,
      retryCount: 0,
      ok: true,
    });
    const [row] = await getAiUsageLog();
    expect(row.durationMs).toBe(1834);
    expect(row.retryCount).toBe(0);
    // Privacy contract still holds: only known metadata fields exist.
    expect(Object.keys(row).sort()).toEqual(
      ["durationMs", "feature", "id", "model", "ok", "provider", "retryCount", "timestamp", "tokens"].sort(),
    );
  });

  it("defaults retryCount to zero when omitted and clamps negatives", async () => {
    await recordAiUsage({
      provider: "p",
      model: "m",
      timestamp: Date.now(),
      feature: "roleplay",
      ok: false,
      durationMs: -50,
      retryCount: -3,
    });
    const [row] = await getAiUsageLog();
    expect(row.retryCount).toBe(0);
    expect(row.durationMs).toBe(0);
    expect(row.ok).toBe(false);
  });

  it("aggregates per-feature failure rate and average duration", async () => {
    const rows = [
      { feature: "explanation", ok: true, durationMs: 800 },
      { feature: "explanation", ok: true, durationMs: 1200 },
      { feature: "explanation", ok: false },
      { feature: "dialogue", ok: true, durationMs: 2000 },
    ];
    for (const row of rows) {
      await recordAiUsage({
        provider: "p",
        model: "m",
        timestamp: Date.now(),
        ...row,
        tokens: 10,
      });
    }
    const stats = await getAiFeatureStats();
    const explanation = stats.find((s) => s.feature === "explanation");
    expect(explanation?.count).toBe(3);
    expect(explanation?.failRatePercent).toBe(33);
    expect(explanation?.avgDurationMs).toBe(1000);
    const dialogue = stats.find((s) => s.feature === "dialogue");
    expect(dialogue?.failRatePercent).toBe(0);
    expect(dialogue?.avgDurationMs).toBe(2000);
  });

  it("budget status keeps working with the extended records", async () => {
    await setBudget({ dailySoftLimit: 100, monthlySoftLimit: 999999 });
    await recordAiUsage({
      provider: "p",
      model: "m",
      timestamp: Date.now(),
      feature: "explanation",
      tokens: 90,
      durationMs: 500,
      retryCount: 0,
      ok: true,
    });
    const status = await getAiBudgetStatus(new Date());
    expect(status.daily.usedTokens).toBe(90);
    expect(status.daily.level).toBe("warn80");
  });
});

async function setBudget(config: { dailySoftLimit: number; monthlySoftLimit: number }) {
  const { setAiBudgetConfig } = await import("@/ai/usage-tracker");
  await setAiBudgetConfig(config);
}
