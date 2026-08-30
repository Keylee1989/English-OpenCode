/**
 * Phase 5 post-build chunk verification.
 * Run AFTER `npm run build`:  node scripts/check-chunks.cjs
 * Asserts that day content and vocabulary groups ship as separate async chunks,
 * and reports the entry bundle size.
 */
const fs = require("fs");
const path = require("path");

const assetsDir = path.join(__dirname, "..", "dist", "assets");
if (!fs.existsSync(assetsDir)) {
  console.error("dist/assets not found — run `npm run build` first.");
  process.exit(1);
}

const files = fs.readdirSync(assetsDir).filter((f) => f.endsWith(".js"));
const kb = (f) => Math.round(fs.statSync(path.join(assetsDir, f)).size / 102.4) / 10;

function find(pattern) {
  return files.filter((f) => f.includes(pattern));
}

let failures = 0;

function expectChunk(nameFragment, minCount = 1) {
  const found = find(nameFragment);
  if (found.length < minCount) {
    console.error(`MISSING: expected >=${minCount} chunk(s) matching "${nameFragment}", got ${found.length}`);
    failures++;
  } else {
    for (const f of found) console.log(`OK  ${f}  ${kb(f)} KB`);
  }
}

expectChunk("days31-50");
expectChunk("days51-70");
expectChunk("days71-90");
expectChunk("generated-days");
["chunk-a-", "chunk-b-", "chunk-c-", "chunk-d-", "chunk-e-", "chunk-f-", "chunk-g-", "chunk-h-", "chunk-i-", "chunk-j-", "chunk-k-"].forEach((frag) =>
  expectChunk(frag),
);

// entry bundle must exist and be reported
const entry = files.find((f) => /^index-.+\.js$/.test(f));
if (!entry) {
  console.error("MISSING entry bundle index-*.js");
  failures++;
} else {
  console.log(`ENTRY  ${entry}  ${kb(entry)} KB`);
  if (kb(entry) > 500) {
    console.error(`Entry bundle is ${kb(entry)} KB (>500 KB goal).`);
    failures++;
  }
}

console.log(failures === 0 ? "\nALL CHUNK CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
