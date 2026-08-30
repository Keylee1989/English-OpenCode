import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import {
  DEFAULT_BUDGET_CONFIG,
  getAiBudgetConfig,
  getAiBudgetStatus,
  recordAiUsage,
  setAiBudgetConfig,
} from "@/ai/usage-tracker";

describe("AI usage budget (Phase 12 P0-2)", () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it("falls back to spec defaults when no config stored", async () => {
    const config = await getAiBudgetConfig();
    expect(config).toEqual(DEFAULT_BUDGET_CONFIG);
    expect(config.dailySoftLimit).toBe(100000);
    expect(config.monthlySoftLimit).toBe(2000000);
  });

  it("persists an edited config", async () => {
    await setAiBudgetConfig({ dailySoftLimit: 5000, monthlySoftLimit: 40000 });
    const config = await getAiBudgetConfig();
    expect(config).toEqual({ dailySoftLimit: 5000, monthlySoftLimit: 40000 });
  });

  it("levels: ok below 80%, warn80 at/above 80%, over100 past the limit", async () => {
    await setAiBudgetConfig({ dailySoftLimit: 1000, monthlySoftLimit: 100000 });
    const today = new Date();
    const iso = (offsetMs: number) =>
      new Date(today.getTime() + offsetMs).toISOString();

    // Today usage = 700 tokens of 1000 -> exactly 70% => ok.
    await recordAiUsage({
      provider: "p",
      model: "m",
      timestamp: Date.now(),
      feature: "explanation",
      tokens: 700,
      ok: true,
    });
    let status = await getAiBudgetStatus(new Date(iso(0)));
    expect(status.daily.usedTokens).toBe(700);
    expect(status.daily.level).toBe("ok");

    // Push to >=80%.
    await recordAiUsage({
      provider: "p",
      model: "m",
      timestamp: Date.now(),
      feature: "roleplay",
      tokens: 200,
      ok: true,
    });
    status = await getAiBudgetStatus(new Date(iso(0)));
    expect(status.daily.percent).toBeGreaterThanOrEqual(80);
    expect(status.daily.level).toBe("warn80");
    expect(status.monthly.level).toBe("ok"); // monthly far from its limit

    // Cross 100% -> level changes but nothing throws / blocks here.
    await recordAiUsage({
      provider: "p",
      model: "m",
      timestamp: Date.now(),
      feature: "dialogue",
      tokens: 300,
      ok: true,
    });
    status = await getAiBudgetStatus(new Date(iso(0)));
    expect(status.daily.usedTokens).toBe(1200);
    expect(status.daily.level).toBe("over100");
  });

  it("failed calls do not count toward budget consumption", async () => {
    await setAiBudgetConfig({ dailySoftLimit: 1000, monthlySoftLimit: 100000 });
    await recordAiUsage({
      provider: "p",
      model: "m",
      timestamp: Date.now(),
      feature: "explanation",
      tokens: 900,
      ok: false,
    });
    const status = await getAiBudgetStatus(new Date());
    expect(status.daily.usedTokens).toBe(0);
    expect(status.daily.level).toBe("ok");
  });

  it("only counts tokens from the current day/month windows", async () => {
    await setAiBudgetConfig({ dailySoftLimit: 1000, monthlySoftLimit: 100000 });
    const now = Date.now();
    await recordAiUsage({
      provider: "p",
      model: "m",
      timestamp: now - 40 * 86400000, // last month
      feature: "explanation",
      tokens: 999999,
      ok: true,
    });
    await recordAiUsage({
      provider: "p",
      model: "m",
      timestamp: now - 2 * 86400000, // earlier this month
      feature: "explanation",
      tokens: 300,
      ok: true,
    });
    await recordAiUsage({
      provider: "p",
      model: "m",
      timestamp: now - 3600000, // today
      feature: "explanation",
      tokens: 100,
      ok: true,
    });
    const status = await getAiBudgetStatus(new Date(now));
    expect(status.daily.usedTokens).toBe(100);
    expect(status.monthly.usedTokens).toBe(400); // excludes last month
    expect(status.monthly.level).toBe("ok");
  });
});
