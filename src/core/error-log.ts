/**
 * Phase 13 P0-3: lightweight crash / error tracking.
 *
 * Records { timestamp, module, type, message } into the settings KV store
 * under one key, capped at MAX_ENTRIES (oldest dropped).
 *
 * PRIVACY CONTRACT: never store API keys, user-generated content, or
 * conversation text. `message` must be a short technical string - callers
 * pass err.message-style text; the sanitizer truncates to 200 chars and
 * strips anything that is not a primitive field. No stack traces with user
 * data, no payloads.
 */
import { db } from "@/data/db";

export const ERROR_LOG_KEY = "error-log";
export const ERROR_LOG_LIMIT = 100;

export interface ErrorLogEntry {
  timestamp: number;
  /** Coarse origin label, e.g. "window" / "ai" / "study". Never user content. */
  module: string;
  /** Short machine kind, e.g. "unhandledrejection" / "storage". */
  type: string;
  /** Truncated technical message (<=200 chars). */
  message: string;
}

function sanitizeMessage(raw: unknown): string {
  let text = typeof raw === "string" ? raw : String(raw ?? "");
  // Drop anything that looks like a key or long embedded content defensively.
  if (/sk-|api[_-]?key/i.test(text)) text = "[redacted: possible credential]";
  return text.slice(0, 200);
}

function asLog(value: unknown): ErrorLogEntry[] {
  return Array.isArray(value) ? (value as ErrorLogEntry[]) : [];
}

/** Capture one error entry. Never throws. */
export async function captureError(
  module: string,
  type: string,
  rawMessage: unknown,
): Promise<void> {
  try {
    await db.open();
    const row = await db.settings.get(ERROR_LOG_KEY);
    const log = asLog(row?.value);
    log.push({
      timestamp: Date.now(),
      module: sanitizeMessage(module).slice(0, 40),
      type: sanitizeMessage(type).slice(0, 40),
      message: sanitizeMessage(rawMessage),
    });
    await db.settings.put({
      key: ERROR_LOG_KEY,
      value: log.slice(-ERROR_LOG_LIMIT),
    });
  } catch {
    // The error logger itself must never become an error source.
  }
}

/** Newest first. */
export async function getRecentErrors(limit = 20): Promise<ErrorLogEntry[]> {
  try {
    const row = await db.settings.get(ERROR_LOG_KEY);
    return asLog(row?.value).slice(-limit).reverse();
  } catch {
    return [];
  }
}

export async function clearErrorLog(): Promise<void> {
  try {
    await db.settings.delete(ERROR_LOG_KEY);
  } catch {
    // ignore
  }
}

/**
 * Install passive global handlers (window errors + unhandled rejections).
 * Bypass-only: failures inside the handlers are swallowed.
 */
export function installGlobalErrorHandlers(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("error", (event) => {
    void captureError("window", "error", event.message ?? "unknown script error");
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    void captureError(
      "window",
      "unhandledrejection",
      reason instanceof Error ? reason.message : String(reason ?? "unknown rejection"),
    );
  });
}
