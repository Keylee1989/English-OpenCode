import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/core/types";
import {
  DATA_TABLE_NAMES,
  SCHEMA_VERSION,
  db,
  loadSettings,
  saveSettings,
} from "@/data/db";

describe("local persistence layer (IndexedDB/Dexie)", () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it("creates schema v1 with exactly the declared tables", async () => {
    expect(db.verno).toBe(SCHEMA_VERSION);
    const tableNames = db.tables.map((table) => table.name).sort();
    expect(tableNames).toEqual([...DATA_TABLE_NAMES].sort());
  });

  it("returns defaults when no settings row exists", async () => {
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it("persists and reloads settings", async () => {
    const modified = { ...DEFAULT_SETTINGS, dailyMinutesTarget: 60, intensity: "intensive" as const };
    await saveSettings(modified);
    await expect(loadSettings()).resolves.toEqual(modified);
  });

  it("falls back to defaults for fields missing in a stored settings object", async () => {
    // Simulates data written by an older app version.
    await db.settings.put({ key: "app", value: { dailyMinutesTarget: 30 } });
    const loaded = await loadSettings();
    expect(loaded.dailyMinutesTarget).toBe(30);
    expect(loaded.adaptiveMode).toBe(DEFAULT_SETTINGS.adaptiveMode);
  });

  it("stores learning events durably", async () => {
    await db.learningEvents.bulkAdd([
      {
        id: "evt-1",
        occurredAt: 1_000,
        skill: "vocabulary",
        interaction: "multiple-choice",
        correct: true,
      },
      {
        id: "evt-2",
        occurredAt: 2_000,
        itemId: "word:apple",
        skill: "listening",
        interaction: "dictation",
        correct: false,
      },
    ]);
    expect(await db.learningEvents.count()).toBe(2);
    const stored = await db.learningEvents.get("evt-2");
    expect(stored?.itemId).toBe("word:apple");
  });
});
