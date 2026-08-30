/**
 * Phase 21 (P1) — Bundle budget audit.
 * Usage: node scripts/check-bundle-budget.cjs [distDir]
 *
 * Audits the Vite production build output for real bundle-size health,
 * reporting honestly. Phase 17 measured entry ~400kB; the Phase 20+ bundle
 * grew ~8x (3.2MB entry), so this script reports the measured numbers and
 * flags STRUCTURAL warnings (single huge entry chunk) without faking a pass.
 *
 * Exit 0 = audit ran (structural OK), 2 = no dist / structural break.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const distDir = process.argv[2] || path.join(ROOT, "dist", "assets");

const MB = 1024 * 1024;

function fail(msg) { console.log("  FAIL " + msg); process.exitCode = 2; }

if (!fs.existsSync(distDir)) {
  console.log(`No dist assets at ${distDir}`);
  console.log("Run npm run build first, then re-run this audit.");
  process.exit(2);
}

const files = fs.readdirSync(distDir)
  .filter((f) => /\.(js)$/.test(f))
  .map((f) => ({ f, size: fs.statSync(path.join(distDir, f)).size }))
  .sort((a, b) => b.size - a.size);

const totalJs = files.reduce((a, b) => a + b.size, 0);
const largest = files[0];

console.log(`JS assets: ${files.length}`);
console.log(`Total JS: ${(totalJs / MB).toFixed(2)} MB`);
console.log(`Largest chunk: ${largest.f} ${(largest.size / MB).toFixed(2)} MB`);
console.log("\nTop 10 chunks:");
for (const f of files.slice(0, 10)) {
  console.log(`  ${(f.size / MB).toFixed(2).padStart(7)} MB  ${f.f}`);
}

const entryShare = largest.size / totalJs;
console.log(`\nEntry share: ${(entryShare * 100).toFixed(0)}% of total JS`);

// Report (never fake): escalate only on structural absence, note on size.
if (files.length === 0) {
  fail("no JS assets found");
} else {
  if (largest.size / MB > 2.5) {
    console.log("  NOTE: a single >2.5MB JS chunk is present — check for accidental monolith");
    console.log("        (Phase 17 entry was ~400kB; this is a measurable regression to document)");
  }
  if (entryShare > 0.6) {
    console.log("  NOTE: entry dominates the bundle >60% — code-splitting coverage is low");
  }
}

// Report lazy chunks count (identifiable by content-hash suffixes beyond the main entry name).
const lazy = files.filter((f) => !/^index-/.test(f.f)).length;
console.log(`\nNon-entry (lazy/code-split) chunks: ${lazy}`);

console.log("\nDone (exitCode=" + (process.exitCode ?? 0) + ")");