/**
 * Phase 11: Data integrity checker.
 * Usage: node scripts/check-data-integrity.cjs
 *
 * Verifies the persistence layer stays safe to ship:
 *  1. Schema declarations in src/data/db.ts
 *     - SCHEMA_VERSION constant matches the highest declared Dexie version
 *     - every migration is ADDITIVE ONLY (each version's store list is a
 *       superset of the previous one -> old data survives upgrades)
 *     - the final version registers every table in DATA_TABLE_NAMES
 *  2. Export/import completeness
 *     - exportAllData dumps exactly the DATA_TABLE_NAMES tables
 *     - validateEnvelope(): future-version rejection, old-version rejection,
 *       malformed envelope rejection, valid envelope acceptance
 *
 * Runtime part bundles the real modules with esbuild; IndexedDB itself is not
 * opened (no DB operations are executed here).
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { build } = require("esbuild");

const failures = [];
function fail(msg) {
  failures.push(msg);
}

function readSrc(rel) {
  return fs.readFileSync(path.join(__dirname, "..", "src", rel), "utf8");
}

// ---------------------------------------------------------------------------
// 1) Static analysis of src/data/db.ts
// ---------------------------------------------------------------------------

const dbSource = readSrc("data/db.ts");

const versionMatches = [...dbSource.matchAll(/this\.version\((\d+)\)\.stores\(\{([\s\S]*?)\}\);/g)];
if (versionMatches.length === 0) {
  fail("db.ts: no Dexie version() declarations found");
}
const declaredVersions = versionMatches.map((m) => Number(m[1])).sort((a, b) => a - b);
const maxDeclared = declaredVersions[declaredVersions.length - 1];

const schemaConst = dbSource.match(/export const SCHEMA_VERSION = (\d+);/);
if (!schemaConst) {
  fail("db.ts: SCHEMA_VERSION constant not found");
} else if (Number(schemaConst[1]) !== maxDeclared) {
  fail(
    `db.ts: SCHEMA_VERSION=${schemaConst[1]} but highest declared Dexie version is ${maxDeclared}`,
  );
}

/** Extract table names from one stores({...}) body via their index strings. */
function tablesOf(storesBody) {
  const set = new Set();
  for (const match of storesBody.matchAll(/(\w+):\s*"([^"]*)"/g)) {
    set.add(match[1]);
  }
  return set;
}

const versionTables = new Map(); // version -> Set(table names)
for (const m of versionMatches) {
  versionTables.set(Number(m[1]), tablesOf(m[2]));
}

// Additive-only migration check (ordered ascending).
for (let i = 1; i < declaredVersions.length; i++) {
  const prev = versionTables.get(declaredVersions[i - 1]);
  const curr = versionTables.get(declaredVersions[i]);
  for (const table of prev) {
    if (!curr.has(table)) {
      fail(`migration v${declaredVersions[i]} DROPPED table "${table}" from v${declaredVersions[i - 1]}`);
    }
  }
}

// Final version must register every exported table name.
const exportListMatch = dbSource.match(/export const DATA_TABLE_NAMES = \[([\s\S]*?)\] as const/);
if (!exportListMatch) {
  fail("db.ts: DATA_TABLE_NAMES not found");
} else {
  const dataTableNames = [...exportListMatch[1].matchAll(/"(\w+)"/g)].map((m) => m[1]);
  const finalTables = versionTables.get(maxDeclared) ?? new Set();
  for (const table of dataTableNames) {
    if (!finalTables.has(table)) {
      fail(`DATA_TABLE_NAMES entry "${table}" missing from final schema v${maxDeclared}`);
    }
  }
  // And no undeclared extras.
  for (const table of finalTables) {
    if (!dataTableNames.includes(table)) {
      fail(`final schema table "${table}" is NOT listed in DATA_TABLE_NAMES (would be lost on export)`);
    }
  }

  // exportAllData must iterate exactly DATA_TABLE_NAMES.
  const eiSource = readSrc("data/export-import.ts");
  const dumpMatch = eiSource.match(/exportAllData[\s\S]*?for \(const name of ([A-Z_]+)\)/);
  if (!dumpMatch || dumpMatch[1] !== "DATA_TABLE_NAMES") {
    fail("export-import.ts: exportAllData does not iterate DATA_TABLE_NAMES directly");
  }
  console.log(`DATA_TABLE_NAMES (${dataTableNames.length}): ${dataTableNames.join(", ")}`);
}

console.log(
  `Schema versions declared: [${declaredVersions.join(", ")}], SCHEMA_VERSION=${
    schemaConst ? schemaConst[1] : "?"
  }`,
);

// ---------------------------------------------------------------------------
// 2) Runtime behavior of validateEnvelope (pure function, real module)
// ---------------------------------------------------------------------------

async function runtimeChecks() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "data-integrity-"));
  const entry = path.join(tmp, "entry.ts");
  const outfile = path.join(tmp, "bundle.mjs");
  fs.writeFileSync(entry, 'export { validateEnvelope, APP_VERSION } from "@/data/export-import";');
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node18",
    alias: { "@": path.join(__dirname, "..", "src") },
    logLevel: "silent",
    banner: {
      // Dexie constructs lazily; provide harmless stand-ins so import succeeds.
      js: "globalThis.indexedDB ??= {};",
    },
  });
  let p = outfile.split(path.sep).join("/");
  if (!p.startsWith("/")) p = "/" + p;
  const mod = await import("file://" + p);

  const expectThrow = (label, fn) => {
    try {
      fn();
      fail(`${label}: expected rejection but import was accepted`);
    } catch (err) {
      console.log(`OK  ${label} -> ${(err instanceof Error ? err.message : String(err)).slice(0, 60)}`);
    }
  };

  expectThrow("rejects non-object envelope", () => mod.validateEnvelope(null));
  expectThrow("rejects string envelope", () => mod.validateEnvelope("backup"));
  expectThrow(
    "rejects missing schemaVersion",
    () => mod.validateEnvelope({ data: {} }),
  );
  expectThrow(
    "rejects FUTURE schema version",
    () =>
      mod.validateEnvelope({
        schemaVersion: Number(schemaConst ? schemaConst[1] : 7) + 1,
        appVersion: "x",
        exportedAt: 0,
        tables: [],
        data: {},
      }),
  );
  expectThrow(
    "rejects OLDER schema version",
    () =>
      mod.validateEnvelope({
        schemaVersion: 1,
        appVersion: "x",
        exportedAt: 0,
        tables: [],
        data: {},
      }),
  );
  expectThrow(
    "rejects envelope without data",
    () =>
      mod.validateEnvelope({
        schemaVersion: Number(schemaConst ? schemaConst[1] : 7),
        appVersion: "x",
        exportedAt: 0,
        tables: [],
      }),
  );

  // Valid same-version envelope passes and round-trips its fields.
  try {
    const envelope = mod.validateEnvelope({
      schemaVersion: Number(schemaConst ? schemaConst[1] : 7),
      appVersion: mod.APP_VERSION,
      exportedAt: Date.now(),
      tables: ["settings"],
      data: { settings: [] },
    });
    if (envelope.data.settings.length !== 0) fail("valid envelope: data mutated by validation");
    console.log("OK  valid same-version envelope accepted");
  } catch (err) {
    fail(`valid envelope unexpectedly rejected: ${err instanceof Error ? err.message : String(err)}`);
  }

  fs.rmSync(tmp, { recursive: true, force: true });
}

(async () => {
  await runtimeChecks();

  console.log(`\nFailures: ${failures.length}`);
  failures.forEach((f) => console.log("  FAIL " + f));
  process.exit(failures.length === 0 ? 0 : 2);
})().catch((err) => {
  console.error("checker crashed:", err);
  process.exit(1);
});
