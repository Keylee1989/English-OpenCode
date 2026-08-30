/**
 * Gamification Engine v0 (Phase 4-B) - honest, minimal, no animations.
 *
 * Design rules (spec §gamification):
 * - XP binds ONLY to real learning events: finishing a lesson block,
 *   finishing a review/drill block, completing a daily assessment.
 * - Streak counts consecutive calendar days that earned any XP.
 *   Same-day repeats never inflate the streak.
 * - Levels are a pure function of XP. Badges are pure functions of stats.
 * - Everything is persisted in one Dexie row ("main"), schema v5.
 */
import { db, type GamificationRow } from "@/data/db";
import { todayISO } from "@/engines/planner/planner-v0";

// ---------------------------------------------------------------------------
// Pure rules (unit-tested)
// ---------------------------------------------------------------------------

export const XP_RULES = {
  lesson: 50,
  practice: 30,
  review: 20,
  drill: 25,
  assessment: 40,
} as const;

export type XpEventKind = keyof typeof XP_RULES;

/** Level curve: +1 level every 300 XP. Level 1 starts at 0 XP. */
export const LEVEL_STEP = 300;

/** Default weekly XP goal; user-tunable via setWeeklyGoal(). */
export const DEFAULT_WEEKLY_GOAL_XP = 300;

/** Daily XP ring size: keep the last 90 active days. */
export const DAILY_XP_CAP = 90;

/** ISO Monday of the week containing the given YYYY-MM-DD (UTC math). */
export function weekStartOf(dateISO: string): string {
  const date = new Date(`${dateISO}T00:00:00Z`);
  const day = date.getUTCDay(); // 0=Sun .. 6=Sat
  const diff = day === 0 ? 6 : day - 1; // Monday-based
  date.setUTCDate(date.getUTCDate() - diff);
  return date.toISOString().slice(0, 10);
}

export interface WeeklyProgress {
  goalXp: number;
  earnedXp: number;
  percent: number;
}

/** Pure weekly progress calculation. */
export function computeWeeklyProgress(
  weeklyGoalXp: number,
  xpAtWeekStart: number,
  xpNow: number,
): WeeklyProgress {
  const earnedXp = Math.max(0, xpNow - xpAtWeekStart);
  const percent = weeklyGoalXp <= 0 ? 100 : Math.min(100, Math.round((earnedXp / weeklyGoalXp) * 100));
  return { goalXp: weeklyGoalXp, earnedXp, percent };
}

export function levelForXp(xp: number): number {
  if (!Number.isFinite(xp) || xp < 0) return 1;
  return Math.floor(xp / LEVEL_STEP) + 1;
}

export interface BadgeRule {
  id: string;
  nameZh: string;
  descriptionZh: string;
}

export const BADGES: readonly BadgeRule[] = [
  { id: "first-lesson", nameZh: "第一课", descriptionZh: "完成第 1 天课程" },
  { id: "lessons-10", nameZh: "十课之约", descriptionZh: "累计完成 10 天课程" },
  { id: "lessons-30", nameZh: "三十天里程碑", descriptionZh: "累计完成 30 天课程" },
  { id: "lessons-90", nameZh: "九十天里程碑", descriptionZh: "累计完成 90 天课程" },
  { id: "streak-7", nameZh: "七日坚持", descriptionZh: "连续学习 7 天" },
  { id: "streak-30", nameZh: "三十日坚持", descriptionZh: "连续学习 30 天" },
  { id: "xp-1000", nameZh: "千点学者", descriptionZh: "累计获得 1000 XP" },
];

function nextDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Streak transition: same day -> unchanged; exactly next calendar day -> +1;
 * gap -> reset to 1. `lastActive` null means first ever activity.
 */
export function computeStreak(
  lastActiveDateISO: string | null,
  todayDateISO: string,
  previousStreak: number,
): number {
  if (lastActiveDateISO === null) return 1;
  if (lastActiveDateISO === todayDateISO) return Math.max(1, previousStreak);
  if (nextDay(lastActiveDateISO) === todayDateISO) return previousStreak + 1;
  return 1;
}

export interface GamificationStats {
  xp: number;
  level: number;
  streakDays: number;
  bestStreakDays: number;
  counters: GamificationRow["counters"];
}

/** All badges whose conditions are met by the given stats. Pure. */
export function computeEarnedBadges(stats: GamificationStats): string[] {
  const earned: string[] = [];
  const { counters } = stats;
  if (counters.lessonsCompleted >= 1) earned.push("first-lesson");
  if (counters.lessonsCompleted >= 10) earned.push("lessons-10");
  if (counters.lessonsCompleted >= 30) earned.push("lessons-30");
  if (counters.lessonsCompleted >= 90) earned.push("lessons-90");
  if (stats.bestStreakDays >= 7) earned.push("streak-7");
  if (stats.bestStreakDays >= 30) earned.push("streak-30");
  if (stats.xp >= 1000) earned.push("xp-1000");
  return earned;
}

// ---------------------------------------------------------------------------
// Persistence + award API
// ---------------------------------------------------------------------------

function defaultRow(): GamificationRow {
  return {
    id: "main",
    xp: 0,
    level: 1,
    streakDays: 0,
    bestStreakDays: 0,
    lastActiveDateISO: null,
    counters: {
      lessonsCompleted: 0,
      reviewsCompleted: 0,
      assessmentsCompleted: 0,
      daysActive: 0,
    },
    unlockedBadges: [],
    weeklyGoalXp: DEFAULT_WEEKLY_GOAL_XP,
    weekStartISO: null,
    xpAtWeekStart: 0,
    dailyXp: [],
    updatedAt: Date.now(),
  };
}

export async function setWeeklyGoal(goalXp: number): Promise<GamificationRow> {
  const row = await getGamificationSnapshot();
  row.weeklyGoalXp = Math.max(50, Math.min(5000, Math.round(goalXp)));
  row.updatedAt = Date.now();
  await db.gamification.put(row);
  return row;
}

export async function getGamificationSnapshot(): Promise<GamificationRow> {
  const row = await db.gamification.get("main");
  return row ?? defaultRow();
}

export interface AwardResult {
  row: GamificationRow;
  xpGained: number;
  newBadges: BadgeRule[];
}

/**
 * Award XP for one real learning event and update streak/badges/level.
 * Multiple events on the same day are fine; the streak only advances once
 * per calendar day.
 */
export async function awardXp(kind: XpEventKind, nowMs: number = Date.now()): Promise<AwardResult> {
  const today = todayISO(nowMs);
  const previous = await getGamificationSnapshot();
  const previousBadgeIds = new Set(previous.unlockedBadges);

  let xpGained = XP_RULES[kind];
  // Streak bonus for the FIRST xp-granting action of a new active day.
  const isNewDay = previous.lastActiveDateISO !== today;
  const streakBefore = computeStreak(previous.lastActiveDateISO, today, previous.streakDays);
  if (isNewDay && streakBefore > 1) xpGained += 10; // small continuation bonus

  const row: GamificationRow = {
    ...previous,
    counters: { ...previous.counters },
    dailyXp: [...previous.dailyXp],
    xp: previous.xp + xpGained,
  };
  row.level = levelForXp(row.xp);
  row.streakDays = streakBefore;
  row.bestStreakDays = Math.max(row.bestStreakDays, row.streakDays);

  // Weekly goal window: reset snapshot when entering a new ISO week.
  const thisWeekStart = weekStartOf(today);
  if (row.weekStartISO !== thisWeekStart) {
    row.weekStartISO = thisWeekStart;
    row.xpAtWeekStart = previous.xp; // cumulative XP at the week boundary
  }

  // True daily XP curve (ring buffer, last DAILY_XP_CAP active days).
  const todayPoint = row.dailyXp.find((point) => point.dateISO === today);
  if (todayPoint) {
    todayPoint.xp += xpGained;
  } else {
    row.dailyXp.push({ dateISO: today, xp: xpGained });
    if (row.dailyXp.length > DAILY_XP_CAP) {
      row.dailyXp = row.dailyXp.slice(-DAILY_XP_CAP);
    }
  }

  if (isNewDay) {
    row.lastActiveDateISO = today;
    row.counters.daysActive += 1;
  }

  switch (kind) {
    case "lesson":
      row.counters.lessonsCompleted += 1;
      break;
    case "review":
    case "drill":
      row.counters.reviewsCompleted += 1;
      break;
    case "assessment":
      row.counters.assessmentsCompleted += 1;
      break;
  }

  row.unlockedBadges = computeEarnedBadges({
    xp: row.xp,
    level: row.level,
    streakDays: row.streakDays,
    bestStreakDays: row.bestStreakDays,
    counters: row.counters,
  });
  row.updatedAt = nowMs;

  await db.gamification.put(row);

  const newBadges = BADGES.filter(
    (badge) => row.unlockedBadges.includes(badge.id) && !previousBadgeIds.has(badge.id),
  );

  return { row, xpGained, newBadges };
}
