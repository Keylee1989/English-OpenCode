/**
 * Phase 12 P0-1: Beta Analytics - READ ONLY.
 *
 * Turns the Beta Test Mode event log + real progress tables into the
 * funnel / drop-off / difficulty views product iteration needs:
 *   - Funnel: Day1 completion, Day3/Day7 retention, Day30 completion
 *   - Drop-off: grouped by step, block kind, and curriculum day
 *   - Difficulty feedback: easy/normal/hard counts by day
 *
 * Single-user local-first today; every aggregate is computed from raw rows so
 * the same functions keep working when multi-user logs are exported later.
 */
import { db } from "@/data/db";
import { getBetaLog, type BetaEvent } from "@/study/beta-mode";

// ---------------------------------------------------------------------------
// Funnel (from dayProgress - the source of truth for curriculum progress)
// ---------------------------------------------------------------------------

export interface FunnelStats {
  /** % of learners who finished Day 1's assessment (single user: 0 or 100). */
  day1CompletionRatePercent: number;
  /** % of learners whose progress reached at least Day N. */
  day3RetentionRatePercent: number;
  day7RetentionRatePercent: number;
  day30CompletionRatePercent: number;
  maxDayReached: number;
  daysCompleted: number;
}

export async function getFunnelStats(): Promise<FunnelStats> {
  const rows = await db.dayProgress.toArray();
  const completed = new Set(rows.filter((r) => r.status === "completed").map((r) => r.day));
  const reached = rows.map((r) => r.day);
  const maxDayReached = reached.length === 0 ? 0 : Math.max(...reached);
  const pct = (done: boolean): number => (done ? 100 : 0);
  return {
    day1CompletionRatePercent: pct(completed.has(1)),
    day3RetentionRatePercent: pct(maxDayReached >= 3),
    day7RetentionRatePercent: pct(maxDayReached >= 7),
    day30CompletionRatePercent: pct(completed.has(30)),
    maxDayReached,
    daysCompleted: completed.size,
  };
}

// ---------------------------------------------------------------------------
// Drop-off analysis (from beta log)
// ---------------------------------------------------------------------------

export interface DropOffGroup {
  key: string;
  count: number;
}

export interface DropOffAnalysis {
  totalEvents: number;
  byStep: DropOffGroup[];
  byBlockKind: DropOffGroup[];
  byDay: DropOffGroup[];
  /** Most-abandoned single location, e.g. "Day5 · listening". */
  worstSpotZh: string | null;
}

function groupCount(events: BetaEvent[], pick: (payload: Record<string, unknown>) => string | null): DropOffGroup[] {
  const map = new Map<string, number>();
  for (const event of events) {
    const key = pick(event.payload ?? {});
    if (key === null) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getDropOffAnalysis(): Promise<DropOffAnalysis> {
  const all = await getBetaLog();
  const drops = all.filter((e) => e.kind === "drop-off");
  const byStep = groupCount(drops, (p) =>
    typeof p.step === "number" ? `步骤 ${p.step}` : null,
  );
  const byBlockKind = groupCount(drops, (p) =>
    typeof p.blockKind === "string" ? p.blockKind : null,
  );
  const byDay = groupCount(drops, (p) =>
    typeof p.day === "number" ? `Day ${p.day}` : null,
  );
  let worstSpotZh: string | null = null;
  if (drops.length > 0 && byDay.length > 0 && byBlockKind.length > 0) {
    worstSpotZh = `${byDay[0].key} · ${byBlockKind[0].key}（${byBlockKind[0].count} 次退出）`;
  }
  return {
    totalEvents: drops.length,
    byStep,
    byBlockKind,
    byDay,
    worstSpotZh,
  };
}

// ---------------------------------------------------------------------------
// Difficulty feedback analysis (from beta log)
// ---------------------------------------------------------------------------

export interface DifficultyStats {
  total: number;
  easy: number;
  normal: number;
  hard: number;
  /** hard feedback grouped by curriculum day, most-flagged first. */
  hardByDay: DropOffGroup[];
  /** All ratings grouped by day. */
  byDay: DropOffGroup[];
  /** % of ratings that were "hard". */
  hardPercent: number;
}

export async function getDifficultyStats(): Promise<DifficultyStats> {
  const all = await getBetaLog();
  const feedback = all.filter((e) => e.kind === "difficulty-feedback");
  let easy = 0;
  let normal = 0;
  let hard = 0;
  for (const e of feedback) {
    const rating = String(e.payload?.rating ?? "");
    if (rating === "偏易") easy += 1;
    else if (rating === "适中") normal += 1;
    else if (rating === "偏难") hard += 1;
  }
  return {
    total: feedback.length,
    easy,
    normal,
    hard,
    hardByDay: groupCount(
      feedback.filter((e) => String(e.payload?.rating ?? "") === "偏难"),
      (p) => (typeof p.day === "number" ? `Day ${p.day}` : null),
    ),
    byDay: groupCount(feedback, (p) =>
      typeof p.day === "number" ? `Day ${p.day}` : null,
    ),
    hardPercent:
      feedback.length === 0 ? 0 : Math.round((hard / feedback.length) * 100),
  };
}

/** Convenience bundle used by the dashboard page. */
export interface BetaAnalyticsBundle {
  generatedAt: number;
  funnel: FunnelStats;
  dropOff: DropOffAnalysis;
  difficulty: DifficultyStats;
  sessionCount: number;
}

export async function getBetaAnalyticsBundle(): Promise<BetaAnalyticsBundle> {
  const [funnel, dropOff, difficulty, all] = await Promise.all([
    getFunnelStats(),
    getDropOffAnalysis(),
    getDifficultyStats(),
    getBetaLog(),
  ]);
  return {
    generatedAt: Date.now(),
    funnel,
    dropOff,
    difficulty,
    sessionCount: all.filter((e) => e.kind === "session-start").length,
  };
}
