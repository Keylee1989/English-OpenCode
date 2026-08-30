import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/data/db";
import {
  awardXp,
  BADGES,
  computeEarnedBadges,
  computeStreak,
  getGamificationSnapshot,
  levelForXp,
  XP_RULES,
} from "@/engines/gamification/gamification-v0";

const DAY1 = "2026-08-20";
const DAY2 = "2026-08-21";

beforeEach(async () => {
  await db.gamification.clear();
});

describe("gamification pure rules", () => {
  it("level curve: +1 level per 300 xp", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(299)).toBe(1);
    expect(levelForXp(300)).toBe(2);
    expect(levelForXp(900)).toBe(4);
    expect(levelForXp(-5)).toBe(1);
  });

  it("streak transitions: same day / next day / gap / first ever", () => {
    expect(computeStreak(null, DAY1, 0)).toBe(1);
    expect(computeStreak(DAY1, DAY1, 3)).toBe(3); // same day: unchanged
    expect(computeStreak(DAY1, DAY2, 3)).toBe(4); // consecutive: +1
    expect(computeStreak("2026-08-01", DAY2, 9)).toBe(1); // gap: reset
  });

  it("badges are pure functions of stats", () => {
    const base = {
      xp: 0,
      level: 1,
      streakDays: 0,
      bestStreakDays: 0,
      counters: { lessonsCompleted: 0, reviewsCompleted: 0, assessmentsCompleted: 0, daysActive: 0 },
    };
    expect(computeEarnedBadges(base)).toEqual([]);
    expect(
      computeEarnedBadges({
        ...base,
        xp: 1000,
        bestStreakDays: 7,
        counters: { ...base.counters, lessonsCompleted: 10 },
      }).sort(),
    ).toEqual(["first-lesson", "lessons-10", "streak-7", "xp-1000"].sort());
    // 90-day milestone requires 90 lessons exactly.
    const ninety = computeEarnedBadges({
      ...base,
      counters: { ...base.counters, lessonsCompleted: 90 },
    });
    expect(ninety).toContain("lessons-90");
    expect(ninety).toContain("lessons-30");
    expect(BADGES.length).toBeGreaterThanOrEqual(6);
  });
});

describe("awardXp persistence flow", () => {
  it("awards lesson xp once, unlocks the first badge and counts a day", async () => {
    const result = await awardXp("lesson");
    expect(result.xpGained).toBe(XP_RULES.lesson); // 50; no streak bonus on day one
    expect(result.row.xp).toBe(50);
    expect(result.row.streakDays).toBe(1);
    expect(result.row.level).toBe(1);
    expect(result.row.unlockedBadges).toContain("first-lesson");
    expect(result.newBadges.map((b) => b.id)).toContain("first-lesson");
    const persisted = await getGamificationSnapshot();
    expect(persisted.xp).toBe(50);
  });

  it("same-day repeat does not inflate the streak or double-count days", async () => {
    await awardXp("lesson");
    const second = await awardXp("review");
    expect(second.row.streakDays).toBe(1);
    expect(second.xpGained).toBe(XP_RULES.review); // no bonus: same day
    expect(second.row.counters.daysActive).toBe(1);
    expect(second.row.counters.reviewsCompleted).toBe(1);
  });

  it("consecutive days add +1 streak and grant the continuation bonus", async () => {
    await awardXp("lesson"); // day 1
    const tomorrow = await awardXp("practice", Date.now() + 86400000);
    expect(tomorrow.row.streakDays).toBe(2);
    expect(tomorrow.xpGained).toBe(XP_RULES.practice + 10);
    expect(tomorrow.row.bestStreakDays).toBe(2);
  });

  it("a skipped day resets the streak to 1 (no bonus)", async () => {
    await awardXp("lesson");
    const later = await awardXp("review", Date.now() + 3 * 86400000);
    expect(later.row.streakDays).toBe(1);
    expect(later.xpGained).toBe(XP_RULES.review);
  });

  it("assessment completions count toward their own counter", async () => {
    const result = await awardXp("assessment");
    expect(result.row.counters.assessmentsCompleted).toBe(1);
    expect(result.xpGained).toBe(XP_RULES.assessment);
  });

  it("levels up at 300 xp across several awards", async () => {
    for (let i = 0; i < 6; i++) {
      await awardXp("lesson", Date.now() + i * 86400000);
    }
    const snap = await getGamificationSnapshot();
    expect(snap.xp).toBeGreaterThanOrEqual(300);
    expect(snap.level).toBe(2);
  });
});
