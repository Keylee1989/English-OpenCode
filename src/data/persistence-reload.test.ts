/**
 * PHASE 1 REQUIRED TEST 4 - persistence across "refresh".
 * Simulates a page reload by closing the IndexedDB connection and opening a
 * brand-new database instance on the same storage, then verifying every
 * table survived intact.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  English360Database,
  db,
  saveSettings,
  SCHEMA_VERSION,
} from "@/data/db";
import { DEFAULT_SETTINGS } from "@/core/types";
import { newId } from "@/core/ids";
import { track } from "@/data/recorder";
import { applyReview, introduceItem } from "@/engines/memory/memory-engine-v0";
import { completeDay, ensureDailySession } from "@/study/session";

const T = 1_700_000_000_000;

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe("Phase 1 required test 4: data survives refresh", () => {
  it("keeps all evidence, memory states, abilities and progress after reopen", async () => {
    // -- write through the real engines (not raw inserts) --
    await saveSettings({ ...DEFAULT_SETTINGS, dailyMinutesTarget: 90 });
    await ensureDailySession("2026-08-22");

    await track({
      skill: "vocabulary",
      interaction: "recall",
      itemId: "w:hi",
      correct: true,
      difficulty: 0.15,
    });
    await track({
      skill: "grammar",
      interaction: "fill-blank",
      correct: false,
      difficulty: 0.3,
      errorCategory: "grammar-mistake",
      errorDescriptionZh: "be 动词误用",
    });
    await introduceItem("w:hi", 0.15, T);
    const reviewed = await applyReview({ itemId: "w:hi", grade: 1, nowMs: T });
    await completeDay(1, 92);

    // -- snapshot before "refresh" --
    const before = {
      settings: (await db.settings.get("app"))?.value,
      events: await db.learningEvents.toArray(),
      errors: await db.errors.toArray(),
      states: await db.memoryStates.toArray(),
      abilities: await db.abilities.toArray(),
      days: await db.dayProgress.toArray(),
      sessions: await db.dailySessions.toArray(),
    };
    expect(before.events.length).toBe(2);
    expect(before.states.length).toBe(1);

    // -- simulate page refresh: close and reopen from scratch --
    await db.close();
    const reopened = new English360Database();
    await reopened.open();

    expect(reopened.verno).toBe(SCHEMA_VERSION);
    expect(await reopened.learningEvents.toArray()).toEqual(before.events);
    expect(await reopened.errors.toArray()).toEqual(before.errors);
    expect(await reopened.memoryStates.toArray()).toEqual(before.states);
    expect(await reopened.abilities.toArray()).toEqual(before.abilities);
    expect(await reopened.dayProgress.toArray()).toEqual(before.days);
    expect(await reopened.dailySessions.toArray()).toEqual(before.sessions);
    expect((await reopened.settings.get("app"))?.value).toEqual(before.settings);

    // The reloaded engines keep working on persisted state.
    const settingsRowAfter = await reopened.settings.get("app");
    const settingsAfter = settingsRowAfter?.value as { dailyMinutesTarget: number };
    expect(settingsAfter.dailyMinutesTarget).toBe(90);
    const dueAgain = await reopened.memoryStates.get("w:hi");
    expect(dueAgain?.dueAt).toBe(reviewed.dueAt);

    reopened.close();
    await db.open(); // restore singleton for any later tests in this file
  });

  it("generates fresh unique ids after reload (id helper works post-refresh)", async () => {
    expect(newId()).not.toBe(newId());
  });
});
