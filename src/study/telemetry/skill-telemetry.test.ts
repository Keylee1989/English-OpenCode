import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import {
  MAX_ENTRIES,
  TELEMETRY_SKILLS,
  getEmptyOrInvalidSkillRatio,
  getSkillTelemetry,
  isTelemetrySkill,
  recordBlockCompletion,
  summarizeTelemetry,
} from "@/study/telemetry/skill-telemetry";

describe("Skill telemetry (Phase 14 P0-1)", () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it("validates skills against the enum", () => {
    expect(isTelemetrySkill("vocabulary")).toBe(true);
    expect(isTelemetrySkill("phonics")).toBe(true);
    expect(isTelemetrySkill("pronunciation")).toBe(false); // folded away
    expect(isTelemetrySkill("hacking")).toBe(false);
    expect(TELEMETRY_SKILLS).toHaveLength(7);
  });

  it("records rows and reads them newest first", async () => {
    await recordBlockCompletion({
      day: 151,
      blockKind: "lesson",
      skills: ["vocabulary"],
      completed: true,
      difficultyFeedback: "适中",
    });
    await recordBlockCompletion({
      day: 152,
      blockKind: "reading",
      skills: ["reading"],
      completed: true,
    });
    const rows = await getSkillTelemetry();
    expect(rows).toHaveLength(2);
    expect(rows[0].blockKind).toBe("reading");
    expect(rows[1].skill).toBe("vocabulary");
    expect(rows[1].difficultyFeedback).toBe("适中");
  });

  it("rejects illegal skills and out-of-range days silently", async () => {
    await recordBlockCompletion({
      day: 0,
      blockKind: "lesson",
      skills: ["vocabulary"],
      completed: true,
    });
    await recordBlockCompletion({
      day: 9999,
      blockKind: "practice",
      skills: ["grammar"],
      completed: true,
    });
    await recordBlockCompletion({
      day: 10,
      blockKind: "practice",
      // @ts-expect-error intentionally bad input
      skills: ["hacking"],
      completed: true,
    });
    expect(await getSkillTelemetry()).toHaveLength(0);
  });

  it("caps the log at MAX_ENTRIES", { timeout: 120000 }, async () => {
    for (let i = 0; i < MAX_ENTRIES + 30; i++) {
      await recordBlockCompletion({
        day: (i % 180) + 1,
        blockKind: "review",
        skills: ["vocabulary"],
        completed: true,
      });
    }
    expect(await getSkillTelemetry()).toHaveLength(MAX_ENTRIES);
  });

  it("summarizes bySkill / byDay / hard feedback consistently", () => {
    const summary = summarizeTelemetry([
      { timestamp: 1, day: 5, blockKind: "listening", skill: "listening", completed: true },
      { timestamp: 2, day: 5, blockKind: "lesson", skill: "vocabulary", completed: true },
      { timestamp: 3, day: 5, blockKind: "drill", skill: "phonics", completed: false },
      { timestamp: 4, day: 6, blockKind: "lesson", skill: "vocabulary", completed: true, difficultyFeedback: "偏难" },
    ]);
    expect(summary.total).toBe(4);
    const vocab = summary.bySkill.find((row) => row.skill === "vocabulary");
    expect(vocab?.count).toBe(2);
    expect(summary.byDay.find((row) => row.day === 5)?.total).toBe(2);
    // Incomplete blocks do not count toward daily completions.
    expect(summary.byDay.find((row) => row.day === 6)?.total).toBe(1);
    expect(summary.hardFeedbackByDay[0]).toEqual({ day: 6, count: 1 });
  });

  it("reports the empty/invalid-skill ratio for stored raw rows", async () => {
    await db.settings.put({
      key: "skill-telemetry",
      value: [
        { timestamp: 1, day: 1, blockKind: "lesson", skill: "vocabulary", completed: true },
        { timestamp: 2, day: 1, blockKind: "lesson", completed: true }, // no skill
      ],
    });
    expect(await getEmptyOrInvalidSkillRatio()).toBe(50);
  });
});
