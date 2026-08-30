/**
 * Phase 13 P0-1: Beta Cohort Analysis - READ ONLY.
 *
 * Groups learners by first-activity date ("cohort") and computes retention
 * (D1/D3/D7/D14/D30), completion averages, and difficulty ratios by day or
 * skill. Single-user local-first today; every function accepts arbitrary user
 * histories so exported multi-user logs aggregate through the same code.
 */
import { db } from "@/data/db";
import { getBetaLog } from "@/study/beta-mode";

export interface UserHistory {
  /** Cohort key: ISO date of first activity. */
  cohortDateISO: string;
  /** Every calendar date with any study activity. */
  activeDatesISO: Set<string>;
  daysCompleted: number;
  minutesTotal: number;
  errorCount: number;
  aiCallCount: number;
}

export interface CohortRetention {
  d1: number;
  d3: number;
  d7: number;
  d14: number;
  d30: number;
}

export interface CohortCompletion {
  avgCompletedDay: number;
  avgMinutes: number;
  avgErrors: number;
  avgAiCalls: number;
}

export type DifficultyRating = "偏易" | "适中" | "偏难";

export interface DifficultyRatioRow {
  key: string;
  total: number;
  easyPercent: number;
  normalPercent: number;
  hardPercent: number;
}

const DAY_MS = 86400000;

function isoShift(iso: string, days: number): string {
  return new Date(new Date(iso + "T00:00:00Z").getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** Dn retention = active on/after start+n (activity-cumulative). */
export function computeCohortRetention(histories: UserHistory[]): CohortRetention {
  const empty = { d1: 0, d3: 0, d7: 0, d14: 0, d30: 0 };
  if (histories.length === 0) return empty;
  const offsets = { d1: 1, d3: 3, d7: 7, d14: 14, d30: 30 } as const;
  const result = { ...empty };
  for (const bucket of Object.keys(offsets) as Array<keyof typeof offsets>) {
    let retained = 0;
    for (const history of histories) {
      const threshold = isoShift(history.cohortDateISO, offsets[bucket]);
      for (const date of history.activeDatesISO) {
        if (date >= threshold) {
          retained += 1;
          break;
        }
      }
    }
    result[bucket] = Math.round((retained / histories.length) * 100);
  }
  return result;
}

function avgOf(histories: UserHistory[], pick: (h: UserHistory) => number): number {
  const sum = histories.reduce((sum, h) => sum + pick(h), 0);
  return Math.round((sum / histories.length) * 10) / 10;
}

export function computeCohortCompletion(histories: UserHistory[]): CohortCompletion {
  if (histories.length === 0) {
    return { avgCompletedDay: 0, avgMinutes: 0, avgErrors: 0, avgAiCalls: 0 };
  }
  return {
    avgCompletedDay: avgOf(histories, (h) => h.daysCompleted),
    avgMinutes: avgOf(histories, (h) => h.minutesTotal),
    avgErrors: avgOf(histories, (h) => h.errorCount),
    avgAiCalls: avgOf(histories, (h) => h.aiCallCount),
  };
}

function ratiosOf(ratings: DifficultyRating[]): Omit<DifficultyRatioRow, "key"> | null {
  if (ratings.length === 0) return null;
  const pct = (n: number): number => Math.round((n / ratings.length) * 100);
  return {
    total: ratings.length,
    easyPercent: pct(ratings.filter((r) => r === "偏易").length),
    normalPercent: pct(ratings.filter((r) => r === "适中").length),
    hardPercent: pct(ratings.filter((r) => r === "偏难").length),
  };
}

/** Group difficulty ratings by an arbitrary dimension (day / skill). */
export function computeDifficultyRatios(
  ratings: Array<{ rating: DifficultyRating; day?: number; skill?: string }>,
  dimension: "day" | "skill",
): DifficultyRatioRow[] {
  const groups = new Map<string, DifficultyRating[]>();
  for (const item of ratings) {
    const key =
      dimension === "day"
        ? typeof item.day === "number"
          ? `Day ${item.day}`
          : null
        : (item.skill ?? null);
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push(item.rating);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .map(([key, list]) => ({
      key,
      ...(ratiosOf(list) as Omit<DifficultyRatioRow, "key">),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

// ---------------------------------------------------------------------------
// Local learner -> UserHistory + full report (READ ONLY)
// ---------------------------------------------------------------------------

export interface CohortReport {
  cohortDateISO: string | null;
  users: number;
  retention: CohortRetention;
  completion: CohortCompletion;
  difficultyOverall: Omit<DifficultyRatioRow, "key"> | null;
  difficultyByDay: DifficultyRatioRow[];
  difficultyBySkill: DifficultyRatioRow[];
}

async function buildLocalHistory(): Promise<UserHistory> {
  const [sessions, progressRows, errorCount, usageRow] = await Promise.all([
    db.dailySessions.toArray(),
    db.dayProgress.toArray(),
    db.errors.count(),
    db.settings.get("ai-usage-log"),
  ]);
  const activeDatesISO = new Set(sessions.map((s) => s.dateISO));
  let cohortDateISO =
    sessions.length === 0
      ? null
      : [...sessions].sort((a, b) => a.dateISO.localeCompare(b.dateISO))[0].dateISO;
  if (!cohortDateISO && progressRows.length > 0) {
    cohortDateISO = new Date(Math.min(...progressRows.map((row) => row.startedAt)))
      .toISOString()
      .slice(0, 10);
  }
  return {
    cohortDateISO: cohortDateISO ?? new Date().toISOString().slice(0, 10),
    activeDatesISO,
    daysCompleted: progressRows.filter((row) => row.status === "completed").length,
    minutesTotal: sessions.reduce(
      (sum, s) => sum + Math.max(0, Math.round(((s.endedAt ?? Date.now()) - s.startedAt) / 60000)),
      0,
    ),
    errorCount,
    aiCallCount: Array.isArray(usageRow?.value) ? usageRow.value.length : 0,
  };
}

interface RatingItem {
  rating: DifficultyRating;
  day?: number;
  skill?: string;
}

function ratingsFromLog(events: Array<{ kind: string; payload?: Record<string, unknown> }>): RatingItem[] {
  const out: RatingItem[] = [];
  for (const event of events) {
    if (event.kind !== "difficulty-feedback") continue;
    const rating = String(event.payload?.rating ?? "");
    if (rating !== "偏易" && rating !== "适中" && rating !== "偏难") continue;
    out.push({
      rating: rating as DifficultyRating,
      ...(typeof event.payload?.day === "number" ? { day: event.payload.day } : {}),
      ...(typeof event.payload?.skill === "string" ? { skill: event.payload.skill } : {}),
    });
  }
  return out;
}

/** Build the full cohort report from local real data. */
export async function getCohortReport(): Promise<CohortReport> {
  const [history, log] = await Promise.all([buildLocalHistory(), getBetaLog()]);
  const ratings = ratingsFromLog(log);
  return {
    cohortDateISO: history.cohortDateISO,
    users: 1,
    retention: computeCohortRetention([history]),
    completion: computeCohortCompletion([history]),
    difficultyOverall: ratiosOf(ratings.map((r) => r.rating)),
    difficultyByDay: computeDifficultyRatios(ratings, "day"),
    difficultyBySkill: computeDifficultyRatios(ratings, "skill"),
  };
}
