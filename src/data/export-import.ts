/**
 * Import / Export Layer (spec §38).
 *
 * Real implementation: dumps every data table into a schema-versioned JSON
 * envelope and restores it inside a single transaction.
 *
 * Rules:
 * - Envelopes from FUTURE schema versions are rejected with a clear error
 *   (the running app cannot safely interpret unknown fields).
 * - Envelopes from OLDER versions are rejected in Phase 1 because only
 *   v1->v2 exists without data migration; a migration path will be added
 *   together with v3 if it ever requires one.
 */
import { DATA_TABLE_NAMES, db, SCHEMA_VERSION } from "@/data/db";
import type { SchemaVersioned } from "@/core/types";

export const APP_VERSION = "0.1.0";

export interface ExportEnvelope extends SchemaVersioned<Record<string, unknown[]>> {
  appVersion: string;
  exportedAt: number;
  tables: string[];
}

// ---------------------------------------------------------------------------
// Phase 14 P1-2: export privacy control.
//
// Diagnostic logs live as rows inside the generic `settings` table, so the
// opt-out is applied per KEY during export. Defaults keep every diagnostic
// log OUT of the bundle; users explicitly opt in when sharing diagnostics.
// ---------------------------------------------------------------------------

export interface ExportOptions {
  /** Include the AI usage statistics log (provider/model/feature metadata). */
  includeAiUsageLog?: boolean;
  /** Include Beta Test Mode telemetry. */
  includeBetaLog?: boolean;
  /** Include the crash/error log. */
  includeErrorLog?: boolean;
}

const SENSITIVE_SETTINGS_KEYS = new Set([
  "ai-usage-log",
  "beta-test-log",
  "error-log",
]);

function settingsKeyAllowed(key: string, options: ExportOptions): boolean {
  if (!SENSITIVE_SETTINGS_KEYS.has(key)) return true;
  if (key === "ai-usage-log") return options.includeAiUsageLog === true;
  if (key === "beta-test-log") return options.includeBetaLog === true;
  if (key === "error-log") return options.includeErrorLog === true;
  return true;
}

export async function exportAllData(options: ExportOptions = {}): Promise<ExportEnvelope> {
  const data: Record<string, unknown[]> = {};
  for (const name of DATA_TABLE_NAMES) {
    const rows = await db.table(name).toArray();
    let encoded = await Promise.all(rows.map((row) => encodeRowAsync(row)));
    // Privacy filter applies to the KV table's sensitive keys only.
    if (name === "settings") {
      encoded = encoded.filter((row) => {
        const key = (row as { key?: unknown })?.key;
        return typeof key === "string" ? settingsKeyAllowed(key, options) : true;
      });
    }
    data[name] = encoded;
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: Date.now(),
    tables: [...DATA_TABLE_NAMES],
    data,
  };
}

// ---------------------------------------------------------------------------
// Binary-safe envelope encoding (Phase 12).
//
// speakingAttempts stores recorded audio as Blob. Raw Blobs die at any
// serialization boundary (e.g. a JSON file download), silently losing
// recordings. Export converts every Blob into a tagged data-URL object;
// import converts them back - so the envelope is lossless BOTH in memory
// and through a real file round-trip.
// ---------------------------------------------------------------------------

const BLOB_MARKER = "__e360blob__";

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return `data:${blob.type || "application/octet-stream"};base64,${btoa(binary)}`;
}

function isBlobMarker(value: unknown): value is { __e360blob__: true; dataUrl: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<string, unknown>)[BLOB_MARKER] === true &&
    typeof (value as Record<string, unknown>).dataUrl === "string"
  );
}

/**
 * Blob detection must be duck-typed: IndexedDB round-trips (fake-indexeddb in
 * tests, some browsers in production) may hand back Blob-like objects from a
 * different realm/polyfill where `instanceof Blob` is false.
 */
function isBlobLike(value: unknown): value is Blob {
  if (!value || typeof value !== "object") return false;
  if ((value as Record<string, unknown>)[BLOB_MARKER] === true) return false;
  const candidate = value as {
    size?: unknown;
    type?: unknown;
    arrayBuffer?: unknown;
    stream?: unknown;
    text?: unknown;
  };
  const hasReader =
    typeof candidate.arrayBuffer === "function" ||
    typeof candidate.stream === "function" ||
    typeof candidate.text === "function";
  return (
    typeof candidate.size === "number" &&
    typeof candidate.type === "string" &&
    hasReader
  );
}

/** Walks a row and converts every Blob into a tagged data-URL object. */
export async function encodeRowAsync(row: unknown): Promise<unknown> {
  if (isBlobLike(row)) {
    return { [BLOB_MARKER]: true, dataUrl: await blobToDataUrl(row) };
  }
  if (Array.isArray(row)) {
    return await Promise.all(row.map((item) => encodeRowAsync(item)));
  }
  if (row && typeof row === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
      out[k] = await encodeRowAsync(v);
    }
    return out;
  }
  return row;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const commaIndex = dataUrl.indexOf(",");
  const meta = dataUrl.slice(0, commaIndex);
  const base64 = dataUrl.slice(commaIndex + 1);
  const type = /^data:([^;]+)/.exec(meta)?.[1] ?? "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** Inverse of the encoder: tagged objects become Blobs again. */
function decodeRow(row: unknown): unknown {
  if (isBlobMarker(row)) return dataUrlToBlob(row.dataUrl);
  if (Array.isArray(row)) return row.map(decodeRow);
  if (row && typeof row === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
      out[k] = decodeRow(v);
    }
    return out;
  }
  return row;
}

export interface ImportSummary {
  importedPerTable: Record<string, number>;
}

export function validateEnvelope(value: unknown): ExportEnvelope {
  if (typeof value !== "object" || value === null) {
    throw new Error("导入文件格式无效：不是有效的备份对象。");
  }
  const envelope = value as Partial<ExportEnvelope>;
  if (typeof envelope.schemaVersion !== "number") {
    throw new Error("导入文件缺少 schemaVersion，无法确认数据格式。");
  }
  if (envelope.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      `备份来自更新的版本（schema v${envelope.schemaVersion}），当前应用只支持 v${SCHEMA_VERSION}。请先升级应用。`,
    );
  }
  if (envelope.schemaVersion < SCHEMA_VERSION) {
    throw new Error(
      `旧版备份（schema v${envelope.schemaVersion}）迁移尚未实现（当前 v${SCHEMA_VERSION}）。`,
    );
  }
  if (typeof envelope.data !== "object" || envelope.data === null) {
    throw new Error("导入文件缺少 data 字段。");
  }
  return envelope as ExportEnvelope;
}

/**
 * Restore from an exported file blob. Reads the text, parses JSON, validates
 * the envelope, and restores atomically inside `importAllData` (a single
 * IndexedDB transaction so a mid-way failure cannot corrupt current data).
 * Returns the import summary.
 *
 * Everything is local-first: no network, no server, no telemetry. Blobs in the
 * envelope (speaking attempt audio) round-trip losslessly through the tagged
 * data-URL encoding in `importAllData`.
 */
export async function importFromFile(file: File | Blob): Promise<ImportSummary> {
  const text = await file.text();
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("导入文件不是合法的 JSON，已取消恢复，未改动任何数据。");
  }
  validateEnvelope(raw);
  return await importAllData(raw);
}

export async function importAllData(raw: unknown): Promise<ImportSummary> {
  const envelope = validateEnvelope(raw);
  const importedPerTable: Record<string, number> = {};

  await db.transaction("rw", db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
    }
    for (const [name, rows] of Object.entries(envelope.data)) {
      // Unknown tables are skipped so future exports stay forward-compatible.
      const table = db.tables.find((candidate) => candidate.name === name);
      if (!table || !Array.isArray(rows) || rows.length === 0) continue;
      // Phase 12: restore tagged data URLs (e.g. speaking attempt audio).
      const decoded = rows.map((row) => decodeRow(row));
      await table.bulkAdd(decoded);
      importedPerTable[name] = decoded.length;
    }
  });

  return { importedPerTable };
}
