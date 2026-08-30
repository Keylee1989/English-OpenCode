import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import { exportAllData } from "@/data/export-import";

/**
 * Phase 14 P1-2: export privacy control. Diagnostic logs must be EXCLUDED
 * from exports by default and only included on explicit opt-in.
 */
describe("Export privacy control (Phase 14 P1-2)", () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((table) => table.clear()));
    // One diagnostic row per sensitive key + one always-included row.
    await db.settings.bulkPut([
      { key: "app", value: { studyMode: "normal" } },
      {
        key: "ai-usage-log",
        value: [{ id: "u1", provider: "p", model: "m", timestamp: 1, feature: "chat", ok: true }],
      },
      { key: "beta-test-log", value: [{ id: "b1", ts: 1, kind: "drop-off", payload: {} }] },
      { key: "error-log", value: [{ timestamp: 1, module: "window", type: "error", message: "x" }] },
    ]);
  });

  function exportedSettingsKeys(envelope: Awaited<ReturnType<typeof exportAllData>>): string[] {
    const rows = (envelope.data.settings ?? []) as Array<{ key?: string }>;
    return rows.map((row) => row.key).filter((key): key is string => typeof key === "string");
  }

  it("excludes every diagnostic log by default", async () => {
    const envelope = await exportAllData();
    const keys = exportedSettingsKeys(envelope);
    expect(keys).toContain("app");
    expect(keys).not.toContain("ai-usage-log");
    expect(keys).not.toContain("beta-test-log");
    expect(keys).not.toContain("error-log");
  });

  it("includes only the logs the user explicitly opted into", async () => {
    const envelope = await exportAllData({ includeBetaLog: true });
    const keys = exportedSettingsKeys(envelope);
    expect(keys).toContain("beta-test-log"); // opted in
    expect(keys).not.toContain("ai-usage-log"); // still excluded
    expect(keys).not.toContain("error-log"); // still excluded
  });

  it("includes all diagnostic logs when everything is enabled", async () => {
    const envelope = await exportAllData({
      includeAiUsageLog: true,
      includeBetaLog: true,
      includeErrorLog: true,
    });
    const keys = exportedSettingsKeys(envelope);
    expect(keys).toEqual(expect.arrayContaining(["ai-usage-log", "beta-test-log", "error-log"]));
  });
});
