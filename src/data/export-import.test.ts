import { beforeEach, describe, expect, it } from "vitest";
import { SCHEMA_VERSION, db } from "@/data/db";
import {
  exportAllData,
  importAllData,
  importFromFile,
  validateEnvelope,
} from "@/data/export-import";

async function seedSampleData(): Promise<void> {
  await db.settings.put({ key: "app", value: { dailyMinutesTarget: 120 } });
  await db.learningEvents.bulkAdd([
    { id: "e1", occurredAt: 1, skill: "reading", interaction: "tap", correct: true },
    { id: "e2", occurredAt: 2, skill: "writing", interaction: "writing", correct: false },
  ]);
  await db.memoryStates.bulkPut([
    {
      itemId: "word:apple",
      stage: "recognized",
      stability: 1.5,
      difficulty: 0.3,
      dueAt: 100,
      lastReviewedAt: null,
      successfulReps: 0,
      lapses: 0,
      reviewCount: 0,
      successCount: 0,
      failureCount: 0,
      producedCount: 0,
    },
  ]);
  await db.errors.bulkAdd([
    {
      id: "err-1",
      occurredAt: 2,
      skill: "writing",
      category: "subject-verb-agreement",
      descriptionZh: "主谓不一致",
      severity: "medium",
      relatedItemIds: [],
      resolvedAt: null,
    },
  ]);
}

describe("import/export layer", () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((table) => table.clear()));
    await seedSampleData();
  });

  it("exports every data table inside a schemaVersion envelope", async () => {
    const envelope = await exportAllData();
    expect(envelope.schemaVersion).toBe(SCHEMA_VERSION);
    expect([...envelope.tables].sort()).toEqual(
      db.tables.map((table) => table.name).sort(),
    );
    expect(envelope.data["learningEvents"]).toHaveLength(2);
    expect(envelope.data["memoryStates"]).toHaveLength(1);
  });

  it("restores a full export after the database is wiped", async () => {
    const envelope = await exportAllData();

    // Simulate data loss / device change.
    await Promise.all(db.tables.map((table) => table.clear()));
    expect(await db.learningEvents.count()).toBe(0);

    const summary = await importAllData(envelope);
    expect(summary.importedPerTable["learningEvents"]).toBe(2);
    expect(await db.learningEvents.get("e1")).toMatchObject({ skill: "reading" });
    expect((await loadSettingsRow())?.value).toEqual({ dailyMinutesTarget: 120 });
  });

  it("clears existing rows before import (no duplicates)", async () => {
    const envelope = await exportAllData();
    await db.learningEvents.add({
      id: "junk",
      occurredAt: 99,
      skill: "grammar",
      interaction: "tap",
      correct: true,
    });

    await importAllData(envelope);
    const ids = (await db.learningEvents.toArray()).map((row) => row.id).sort();
    expect(ids).toEqual(["e1", "e2"]);
  });

  it("rejects envelopes from a newer schema version with a clear error", () => {
    expect(() =>
      validateEnvelope({ schemaVersion: SCHEMA_VERSION + 1, data: {} }),
    ).toThrowError(/升级应用/);
  });

  it("rejects envelopes without a numeric schemaVersion", () => {
    expect(() => validateEnvelope({ data: {} })).toThrowError(/schemaVersion/);
  });

  it("importFromFile restores from a real JSON file blob (round-trip)", async () => {
    const envelope = await exportAllData();
    const file = new File([JSON.stringify(envelope)], "backup.json", {
      type: "application/json",
    });

    await Promise.all(db.tables.map((table) => table.clear()));
    expect(await db.learningEvents.count()).toBe(0);

    const summary = await importFromFile(file);
    expect(summary.importedPerTable["learningEvents"]).toBe(2);
    expect(await db.learningEvents.get("e1")).toMatchObject({ skill: "reading" });
  });

  it("importFromFile rejects invalid JSON without touching current data", async () => {
    const before = await db.learningEvents.count();
    const file = new File(["{not valid json"], "bad.json", { type: "application/json" });

    await expect(importFromFile(file)).rejects.toThrowError(/不是合法的 JSON/);
    expect(await db.learningEvents.count()).toBe(before);
  });

  it("importFromFile rejects a newer-schema file without wiping data", async () => {
    const bad = { schemaVersion: SCHEMA_VERSION + 1, data: {} };
    const file = new File([JSON.stringify(bad)], "new.json", { type: "application/json" });

    await expect(importFromFile(file)).rejects.toThrowError(/升级应用/);
    expect(await db.learningEvents.count()).toBeGreaterThan(0);
  });
});

async function loadSettingsRow() {
  return db.settings.get("app");
}
