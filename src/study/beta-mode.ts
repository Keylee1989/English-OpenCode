/**
 * Phase 11-C Task 6: Beta Test Mode.
 *
 * When the user opts in (studyMode = "beta-test"), extra session telemetry is
 * recorded so a real-learner test can answer:
 *   - on which day/step do users give up?      -> "drop-off"
 *   - which module feels hard?                 -> "difficulty-feedback"
 *   - do sessions get finished?                -> "session-start" / "session-end"
 *
 * Storage: the settings KV table under one key, capped at MAX_LOG rows.
 * No schema version change; no effect on Normal-mode behavior or scoring.
 */
import { db } from "@/data/db";
import { loadSettings, saveSettings } from "@/data/db";
import type { StudyMode } from "@/core/types";

export const BETA_LOG_KEY = "beta-test-log";
const MAX_LOG = 200;

export type BetaEventKind =
  | "session-start"
  | "session-end"
  | "lesson-complete"
  | "drop-off"
  | "difficulty-feedback";

export interface BetaEvent {
  id: string;
  ts: number;
  kind: BetaEventKind;
  payload: Record<string, unknown>;
}

export async function getStudyMode(): Promise<StudyMode> {
  return (await loadSettings()).studyMode ?? "normal";
}

export async function setStudyMode(mode: StudyMode): Promise<void> {
  const settings = await loadSettings();
  await saveSettings({ ...settings, studyMode: mode });
}

export async function isBetaMode(): Promise<boolean> {
  return (await getStudyMode()) === "beta-test";
}

function asLog(value: unknown): BetaEvent[] {
  return Array.isArray(value) ? (value as BetaEvent[]) : [];
}

/** Append one beta event; silently no-ops in normal mode or on any error. */
export async function logBetaEvent(
  kind: BetaEventKind,
  payload: Record<string, unknown> = {},
): Promise<void> {
  try {
    if (!(await isBetaMode())) return;
    const row = await db.settings.get(BETA_LOG_KEY);
    const log = asLog(row?.value);
    log.push({ id: `${Date.now()}-${log.length}`, ts: Date.now(), kind, payload });
    await db.settings.put({ key: BETA_LOG_KEY, value: log.slice(-MAX_LOG) });
  } catch {
    // Telemetry must never break the study flow.
  }
}

export async function getBetaLog(): Promise<BetaEvent[]> {
  try {
    const row = await db.settings.get(BETA_LOG_KEY);
    return asLog(row?.value).slice().reverse(); // newest first
  } catch {
    return [];
  }
}

export async function clearBetaLog(): Promise<void> {
  try {
    await db.settings.delete(BETA_LOG_KEY);
  } catch {
    // ignore
  }
}
