/**
 * Phase 14 P0-1: Unified skill-level telemetry.
 *
 * One row per completed learning block, per evidenced skill:
 *   { day, blockKind, skill, difficultyFeedback?, completed, timestamp }
 *
 * Storage: settings KV under one key ("skill-telemetry"), capped at
 * MAX_ENTRIES. Bypass-only - nothing here changes grading, the planner,
 * or course data. Skills are validated against TELEMETRY_SKILLS; unknown
 * skills are dropped at write time so the log stays clean for analytics.
 */
import { db } from "@/data/db";

export const SKILL_TELEMETRY_KEY = "skill-telemetry";
export const MAX_ENTRIES = 500;

export const TELEMETRY_SKILLS = [
  "vocabulary",
  "listening",
  "speaking",
  "reading",
  "writing",
  "grammar",
  "phonics",
] as const;

export type TelemetrySkill = (typeof TELEMETRY_SKILLS)[number];

export function isTelemetrySkill(value: unknown): value is TelemetrySkill {
  return (
    typeof value === "string" &&
    (TELEMETRY_SKILLS as readonly string[]).includes(value)
  );
}

export interface SkillTelemetryEntry {
  timestamp: number;
  day: number;
  blockKind: string;
  skill: TelemetrySkill;
  /** Optional one-tap difficulty rating captured in Beta mode. */
  difficultyFeedback?: "偏易" | "适中" | "偏难";
  completed: boolean;
}

function isEntryShape(value: unknown): value is SkillTelemetryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.timestamp === "number" &&
    typeof entry.day === "number" &&
    typeof entry.blockKind === "string" &&
    isTelemetrySkill(entry.skill) &&
    typeof entry.completed === "boolean"
  );
}

function asLog(value: unknown): SkillTelemetryEntry[] {
  // Drop malformed/legacy rows on read so analytics never see junk.
  return Array.isArray(value) ? value.filter(isEntryShape) : [];
}

/**
 * Record one block-completion telemetry row per skill.
 * Unknown skills and invalid days are silently rejected.
 */
export async function recordBlockCompletion(input: {
  day: number;
  blockKind: string;
  skills: TelemetrySkill[];
  completed?: boolean;
  difficultyFeedback?: "偏易" | "适中" | "偏难";
}): Promise<void> {
  try {
    if (!Number.isFinite(input.day) || input.day < 1 || input.day > 360) return;
    const skills = input.skills.filter(isTelemetrySkill);
    if (skills.length === 0) return;
    await db.open();
    const row = await db.settings.get(SKILL_TELEMETRY_KEY);
    const log = asLog(row?.value);
    const ts = Date.now();
    for (const skill of skills) {
      log.push({
        timestamp: ts,
        day: input.day,
        blockKind: String(input.blockKind).slice(0, 24),
        skill,
        ...(input.difficultyFeedback
          ? { difficultyFeedback: input.difficultyFeedback }
          : {}),
        completed: input.completed !== false,
      });
    }
    await db.settings.put({
      key: SKILL_TELEMETRY_KEY,
      value: log.slice(-MAX_ENTRIES),
    });
  } catch {
    // Telemetry must never break the study flow.
  }
}

/** Newest first. */
export async function getSkillTelemetry(): Promise<SkillTelemetryEntry[]> {
  try {
    await db.open();
    const row = await db.settings.get(SKILL_TELEMETRY_KEY);
    return asLog(row?.value).slice().reverse();
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Aggregations (pure functions - unit-testable without a database)
// ---------------------------------------------------------------------------

export interface SkillCountRow {
  skill: TelemetrySkill;
  count: number;
}

export interface SkillTelemetrySummary {
  total: number;
  emptyOrInvalidSkillRatio: number; // computed over RAW entries by caller
  bySkill: SkillCountRow[];
  byDay: Array<{ day: number; total: number }>;
  hardFeedbackByDay: Array<{ day: number; count: number }>;
}

export function summarizeTelemetry(
  entries: SkillTelemetryEntry[],
): Omit<SkillTelemetrySummary, "emptyOrInvalidSkillRatio"> {
  const bySkill = new Map<string, number>();
  const byDay = new Map<number, number>();
  const hardByDay = new Map<number, number>();
  for (const entry of entries) {
    if (!isTelemetrySkill(entry.skill)) continue;
    bySkill.set(entry.skill, (bySkill.get(entry.skill) ?? 0) + 1);
    if (!entry.completed) continue;
    byDay.set(entry.day, (byDay.get(entry.day) ?? 0) + 1);
    if (entry.difficultyFeedback === "偏难") {
      hardByDay.set(entry.day, (hardByDay.get(entry.day) ?? 0) + 1);
    }
  }
  const sortPairs = <K>(map: Map<K, number>): Array<{ key: K; count: number }> =>
    [...map.entries()].map(([key, count]) => ({ key, count }));
  return {
    total: entries.length,
    bySkill: sortPairs(bySkill)
      .map((row) => ({ skill: row.key as TelemetrySkill, count: row.count }))
      .sort((a, b) => b.count - a.count),
    byDay: sortPairs(byDay)
      .map((row) => ({ day: row.key as number, total: row.count }))
      .sort((a, b) => a.day - b.day),
    hardFeedbackByDay: sortPairs(hardByDay)
      .map((row) => ({ day: row.key as number, count: row.count }))
      .sort((a, b) => a.day - b.day),
  };
}

/** % of raw stored rows whose skill field is missing or illegal. */
export async function getEmptyOrInvalidSkillRatio(): Promise<number> {
  try {
    await db.open();
    const row = await db.settings.get(SKILL_TELEMETRY_KEY);
    if (!Array.isArray(row?.value)) return 0;
    const raw = row.value as unknown[];
    if (raw.length === 0) return 0;
    const valid = raw.filter(isEntryShape).length;
    return Math.round(((raw.length - valid) / raw.length) * 100);
  } catch {
    return 100;
  }
}
