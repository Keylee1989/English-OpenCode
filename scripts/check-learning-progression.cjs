/**
 * Phase 21 (P1) — Learning progression audit.
 * Usage: node scripts/check-learning-progression.cjs
 *
 * Audits that the learning system actually PROGRESSES a learner, rather than
 * being a static pile of content:
 *
 *  1. Authored day coverage vs COURSE_TARGET_DAYS (360-day HARD FREEZE).
 *  2. Vocabulary CEFR band distribution (A1..C2 spread, not all-C2).
 *  3. Per-skill resource depth: reading/listening/writing/speaking pools.
 *  4. Adaptive loop presence: reassessment cadence + SRS + profile wiring are
 *     exported from the adaptive engine (greppable static check on files).
 *
 * Reports measured numbers honestly. Fails only on structural absence.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { build } = require("esbuild");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");

function fail(msg) { console.log("  FAIL " + msg); process.exitCode = 2; }

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "prog-"));
  const entry = path.join(tmp, "e.ts");
  const outfile = path.join(tmp, "b.mjs");
  fs.writeFileSync(entry, [
    'export { COURSE_TARGET_DAYS, AUTHORED_DAYS, DAY_CONTENT } from "@/content/index";',
    'export { allLexical } from "@/content/vocab";',
    'export { READING_ARTICLES } from "@/content/resources/reading-library";',
    'export { LISTENING_RESOURCES } from "@/content/resources/audio-library";',
    'export { WRITING_TASKS } from "@/content/resources/writing-c2";',
    'export { SPEAKING_TASKS } from "@/content/resources/speaking-c2-p19";',
    'export { DEBATE_TOPICS } from "@/content/resources/speaking-c2";',
  ].join("\n"));
  await build({
    entryPoints: [entry], outfile,
    bundle: true, format: "esm", platform: "node", target: "node18",
    alias: { "@": SRC }, logLevel: "silent",
  });
  let p = outfile.split(path.sep).join("/");
  if (!p.startsWith("/")) p = "/" + p;
  const mod = await import("file://" + p);

  // 1. Day coverage.
  const authored = mod.AUTHORED_DAYS;
  const target = mod.COURSE_TARGET_DAYS;
  console.log(`Authored days: ${authored}/${target}`);
  const dayNums = mod.DAY_CONTENT.map((d) => d.day);
  const unique = new Set(dayNums).size;
  const contiguous = dayNums.length === unique && Math.max(...dayNums) - Math.min(...dayNums) + 1 === unique;
  console.log(`Day numbers unique: ${unique}, contiguous: ${contiguous}`);
  if (authored === 0 || unique === 0) fail("no authored days");
  if (!contiguous) console.log("  NOTE: day range not fully contiguous (dynamic days may extend range)");

  // 2. Vocab band distribution.
  const rows = mod.allLexical();
  const levels = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
  for (const e of rows) {
    const l = e.level;
    if (l in levels) levels[l]++;
  }
  console.log(`Vocab by CEFR-level tag:`, JSON.stringify(levels));
  const banded = Object.values(levels).reduce((a, b) => a + b, 0);
  if (banded > 0) {
    const spread = Object.values(levels).filter((n) => n > 0).length;
    console.log(`Level-tagged entries: ${banded}/${rows.length}, tags populated ${spread}/6 bands`);
    if (spread < 4) console.log("  NOTE: level tag only on C1/C2 expansion (base vocab uses difficulty+frequencyBand, not CEFR level)");
  } else {
    console.log("  NOTE: no CEFR level tag on any vocab entries (base vocab uses difficulty+frequencyBand)");
  }
  const diffSpread = new Set(rows.map((e) => Math.round(e.difficulty * 10))).size;
  console.log(`Difficulty-bucket spread (0..10): ${diffSpread}/11 buckets`);

  // 3. Per-skill resource depth.
  const reading = mod.READING_ARTICLES ?? [];
  const listening = mod.LISTENING_RESOURCES ?? [];
  const writing = mod.WRITING_TASKS ?? [];
  const speaking = (mod.SPEAKING_TASKS ?? []).length + (mod.DEBATE_TOPICS ?? []).length;
  console.log(`Reading articles: ${reading.length}, Listening resources: ${listening.length}`);
  console.log(`Writing tasks: ${writing.length}, Speaking (tasks+débate): ${speaking}`);
  if (reading.length < 20) fail("reading pool < 20");
  if (listening.length < 20) fail("listening pool < 20");

  // Reading CEFR spread (C1/C2-only was a known limitation; report honestly).
  const readBands = new Set();
  for (const a of reading) if (a.difficulty) readBands.add(a.difficulty);
  else if (a.level) readBands.add(a.level);
  console.log(`Reading article bands: ${[...readBands].join(",") || "(none tagged)"}`);
  if (readBands.size <= 1) {
    console.log("  NOTE: reading pool is single-band (was C1/C2-only in P17-P20)");
    if (readBands.size === 0) fail("reading pool has no CEFR difficulty tag");
  }

  // 4. Adaptive loop presence (static greps on the adaptive engine).
  const badp = path.join(SRC, "study", "adaptive");
  const files = [
    "learner-profile.ts", "skill-priority.ts", "difficulty-controller.ts",
    "adaptive-plan.ts", "reassessment.ts", "error-remediation.ts",
  ];
  for (const f of files) {
    const fp = path.join(badp, f);
    if (!fs.existsSync(fp)) fail("adaptive engine missing file: " + f);
  }
  const reass = fs.readFileSync(path.join(badp, "reassessment.ts"), "utf8");
  const hasCheckpoints = /CHECKPOINT_DAYS/.test(reass) && /\[1, 7, 30, 60, 90, 180, 360\]/.test(reass);
  const hasDelta = /computeDelta/.test(reass) && /adjustPlanFrom/.test(reass);
  console.log(`Reassessment: checkpoints=${hasCheckpoints} delta+adjust=${hasDelta}`);
  if (!hasCheckpoints || !hasDelta) fail("reassessment loop incomplete");

  const srs = fs.readFileSync(path.join(badp, "skill-review-queue.ts"), "utf8");
  console.log(`SRS skill queue present: ${/dueSkillCount/.test(srs)}`);

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log("\nDone (exitCode=" + (process.exitCode ?? 0) + ")");
})().catch((err) => {
  console.error("checker crashed:", err);
  process.exit(1);
});