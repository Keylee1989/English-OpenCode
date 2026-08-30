/**
 * Phase 11-B Task 5: AI Usage Tracker.
 *
 * Records lightweight metadata for every AI call so future phases can do
 * cost control / model selection / quota decisions:
 *   { provider, model, timestamp, feature, tokens?, ok }
 *
 * PRIVACY CONTRACT:
 * - NEVER stores API keys, message content, prompts or responses - only the
 *   metadata above. The log lives in the settings KV store under one key,
 *   capped at MAX_LOG entries (oldest dropped), and is fully exportable like
 *   any other settings data. It contains no personal information.
 */
import { db } from "@/data/db";
import { newId } from "@/core/ids";

export interface AiUsageRecord {
  id: string;
  /** Provider id, e.g. "openai-compatible". Never a key. */
  provider: string;
  model: string;
  timestamp: number;
  /** Feature label supplied by the call site, e.g. "explanation". */
  feature: string;
  /** Rough input+output token estimate when computable (optional). */
  tokens?: number;
  ok: boolean;
  /** Phase 14 P1-1: wall-clock duration of the call in milliseconds. */
  durationMs?: number;
  /** Phase 14 P1-1: retries observed for this call (0 = first try). */
  retryCount?: number;
}

const SETTINGS_KEY = "ai-usage-log";
const MAX_LOG = 500;

/** Phase 13 P0-4: app-session boundary for the live counter display. */
const SESSION_START = Date.now();

/** Rough token estimate (~4 chars/token) for optional telemetry. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function asLog(value: unknown): AiUsageRecord[] {
  return Array.isArray(value) ? (value as AiUsageRecord[]) : [];
}

export async function recordAiUsage(
  record: Omit<AiUsageRecord, "id"> & { retryCount?: number },
): Promise<void> {
  try {
    const row = await db.settings.get(SETTINGS_KEY);
    const log = asLog(row?.value);
    const entry: AiUsageRecord = {
      id: newId(),
      provider: record.provider,
      model: record.model,
      timestamp: record.timestamp,
      feature: record.feature || "chat",
      ...(record.tokens !== undefined ? { tokens: record.tokens } : {}),
      ...(record.durationMs !== undefined
        ? { durationMs: Math.max(0, Math.round(record.durationMs)) }
        : {}),
      retryCount: Math.max(0, Math.round(record.retryCount ?? 0)),
      ok: record.ok,
    };
    log.push(entry);
    const trimmed = log.slice(-MAX_LOG);
    await db.settings.put({ key: SETTINGS_KEY, value: trimmed });
  } catch {
    // Telemetry must never break an AI call or the study flow.
  }
}

export async function getAiUsageLog(): Promise<AiUsageRecord[]> {
  try {
    const row = await db.settings.get(SETTINGS_KEY);
    return asLog(row?.value).slice().sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

export interface AiUsageSummary {
  total: number;
  ok: number;
  failed: number;
  byFeature: Array<{ feature: string; count: number }>;
  byModel: Array<{ model: string; count: number; ok: number }>;
}

export async function getAiUsageSummary(): Promise<AiUsageSummary> {
  const log = await getAiUsageLog();
  const byFeature = new Map<string, number>();
  const byModel = new Map<string, { count: number; ok: number }>();
  let ok = 0;
  for (const rec of log) {
    if (rec.ok) ok += 1;
    byFeature.set(rec.feature, (byFeature.get(rec.feature) ?? 0) + 1);
    const model = byModel.get(rec.model) ?? { count: 0, ok: 0 };
    model.count += 1;
    if (rec.ok) model.ok += 1;
    byModel.set(rec.model, model);
  }
  return {
    total: log.length,
    ok,
    failed: log.length - ok,
    byFeature: [...byFeature.entries()]
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count),
    byModel: [...byModel.entries()]
      .map(([model, v]) => ({ model, ...v }))
      .sort((a, b) => b.count - a.count),
  };
}

// ---------------------------------------------------------------------------
// Phase 14 P1-1: per-feature quality analysis (slow features / failure rates)
// ---------------------------------------------------------------------------

export interface AiFeatureStat {
  feature: string;
  count: number;
  failCount: number;
  failRatePercent: number;
  avgDurationMs: number | null;
}

export async function getAiFeatureStats(): Promise<AiFeatureStat[]> {
  const log = await getAiUsageLog();
  const groups = new Map<
    string,
    { count: number; failCount: number; durationSum: number; durationN: number }
  >();
  for (const rec of log) {
    const g = groups.get(rec.feature) ?? {
      count: 0,
      failCount: 0,
      durationSum: 0,
      durationN: 0,
    };
    g.count += 1;
    if (!rec.ok) g.failCount += 1;
    if (typeof rec.durationMs === "number") {
      g.durationSum += rec.durationMs;
      g.durationN += 1;
    }
    groups.set(rec.feature, g);
  }
  return [...groups.entries()]
    .map(([feature, g]) => ({
      feature,
      count: g.count,
      failCount: g.failCount,
      failRatePercent: Math.round((g.failCount / g.count) * 100),
      avgDurationMs:
        g.durationN === 0 ? null : Math.round(g.durationSum / g.durationN),
    }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// Phase 12 P0-2: soft budget limits (advisory only - NEVER blocks a call).
// ---------------------------------------------------------------------------

export const BUDGET_CONFIG_KEY = "ai-budget-config";

export interface AiBudgetConfig {
  dailySoftLimit: number;
  monthlySoftLimit: number;
}

export const DEFAULT_BUDGET_CONFIG: AiBudgetConfig = {
  dailySoftLimit: 100_000,
  monthlySoftLimit: 2_000_000,
};

export async function getAiBudgetConfig(): Promise<AiBudgetConfig> {
  try {
    const row = await db.settings.get(BUDGET_CONFIG_KEY);
    const value = row?.value as Partial<AiBudgetConfig> | undefined;
    return {
      dailySoftLimit:
        typeof value?.dailySoftLimit === "number" && value.dailySoftLimit > 0
          ? value.dailySoftLimit
          : DEFAULT_BUDGET_CONFIG.dailySoftLimit,
      monthlySoftLimit:
        typeof value?.monthlySoftLimit === "number" && value.monthlySoftLimit > 0
          ? value.monthlySoftLimit
          : DEFAULT_BUDGET_CONFIG.monthlySoftLimit,
    };
  } catch {
    return { ...DEFAULT_BUDGET_CONFIG };
  }
}

export async function setAiBudgetConfig(config: AiBudgetConfig): Promise<void> {
  await db.settings.put({
    key: BUDGET_CONFIG_KEY,
    value: {
      dailySoftLimit: Math.max(1, Math.round(config.dailySoftLimit)),
      monthlySoftLimit: Math.max(1, Math.round(config.monthlySoftLimit)),
    },
  });
}

export type BudgetLevel = "ok" | "warn80" | "over100";

export interface BudgetPeriodStatus {
  usedTokens: number;
  limitTokens: number;
  percent: number;
  level: BudgetLevel;
}

export interface AiBudgetStatus {
  daily: BudgetPeriodStatus;
  monthly: BudgetPeriodStatus;
}

function periodStatus(used: number, limit: number): BudgetPeriodStatus {
  const percent = limit <= 0 ? 0 : Math.min(999, Math.round((used / limit) * 100));
  return {
    usedTokens: used,
    limitTokens: limit,
    percent,
    level: used >= limit ? "over100" : percent >= 80 ? "warn80" : "ok",
  };
}

/**
 * Current budget consumption vs soft limits. Warnings start at 80%;
 * crossing 100% still only raises the message level - calls are never blocked.
 */
export async function getAiBudgetStatus(now = new Date()): Promise<AiBudgetStatus> {
  const [log, config] = await Promise.all([getAiUsageLog(), getAiBudgetConfig()]);
  const todayISOStr = now.toISOString().slice(0, 10);
  const monthPrefix = todayISOStr.slice(0, 7); // "YYYY-MM"
  let todayTokens = 0;
  let monthTokens = 0;
  for (const rec of log) {
    if (!rec.ok || rec.tokens === undefined) continue;
    const iso = new Date(rec.timestamp).toISOString().slice(0, 10);
    if (iso === todayISOStr) todayTokens += rec.tokens;
    if (iso.startsWith(monthPrefix)) monthTokens += rec.tokens;
  }
  return {
    daily: periodStatus(todayTokens, config.dailySoftLimit),
    monthly: periodStatus(monthTokens, config.monthlySoftLimit),
  };
}

// ---------------------------------------------------------------------------
// Phase 13 P0-4: session-scope AI counter (display only - never limits).
// ---------------------------------------------------------------------------

export interface SessionAiUsage {
  requests: number;
  failedRequests: number;
  estimatedTokens: number;
}

/** Calls + estimated tokens since the app session started. */
export async function getSessionAiUsage(): Promise<SessionAiUsage> {
  const log = await getAiUsageLog();
  let requests = 0;
  let failedRequests = 0;
  let estimatedTokens = 0;
  for (const rec of log) {
    if (rec.timestamp < SESSION_START) continue;
    requests += 1;
    if (!rec.ok) failedRequests += 1;
    if (rec.ok && rec.tokens !== undefined) estimatedTokens += rec.tokens;
  }
  return { requests, failedRequests, estimatedTokens };
}
