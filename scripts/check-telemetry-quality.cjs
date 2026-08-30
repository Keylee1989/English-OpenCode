/**
 * Phase 14 P0-1: Skill telemetry quality gate.
 * Usage: node scripts/check-telemetry-quality.cjs
 *
 *  1. RUNTIME (real module under fake-indexeddb):
 *     - unknown skills are rejected at write time
 *     - malformed rows are dropped on read
 *     - the log is capped at MAX_ENTRIES
 *     - summary aggregations are consistent
 *  2. STATIC: every recordBlockCompletion() call site passes a skills list.
 *  3. LIVE LOG hygiene: empty/invalid-skill ratio must stay <= 5%.
 */
const fs = require("fs");
const path = require("path");

require("fake-indexeddb/auto");

const failures = [];
function fail(msg) {
  failures.push(msg);
}

(async () => {
  // ---- Bundle the real telemetry module -----------------------------------
  const { execSync } = require("child_process");
  const esbuild = require("esbuild");
  const os = require("os");

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "telemetry-gate-"));
  const entry = path.join(tmp, "entry.ts");
  const outfile = path.join(tmp, "bundle.mjs");
  fs.writeFileSync(
    entry,
    [
      'export { db } from "@/data/db";',
      'export {',
      '  SKILL_TELEMETRY_KEY,',
      '  TELEMETRY_SKILLS,',
      '  isTelemetrySkill,',
      '  recordBlockCompletion,',
      '  getSkillTelemetry,',
      '  summarizeTelemetry,',
      '  getEmptyOrInvalidSkillRatio,',
      '  MAX_ENTRIES,',
      "} from \"@/study/telemetry/skill-telemetry\";",
    ].join("\n"),
  );
  await esbuild.build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node18",
    alias: { "@": path.join(process.cwd(), "src") },
    logLevel: "silent",
  });
  let p = outfile.split(path.sep).join("/");
  if (!p.startsWith("/")) p = "/" + p;
  const mod = await import("file://" + p);

  await mod.db.open();
  await Promise.all(mod.db.tables.map((t) => t.clear()));

  // ---- 1a. Unknown / malformed rows are rejected --------------------------
  // Seed a malformed row first; later valid writes must coexist with it and
  // reads must filter the junk out.
  await mod.db.settings.put({
    key: mod.SKILL_TELEMETRY_KEY,
    value: [{ timestamp: 1, day: 3, blockKind: "practice", completed: true }], // no skill at all
  });
  await mod.recordBlockCompletion({ day: 151, blockKind: "lesson", skills: ["vocabulary"], completed: true });
  await mod.recordBlockCompletion({ day: 152, blockKind: "reading", skills: ["reading"], completed: true });

  const rows = await mod.getSkillTelemetry();
  if (rows.length !== 2) fail(`expected 2 valid rows after filtering, got ${rows.length}`);
  for (const row of rows) {
    if (!mod.isTelemetrySkill(row.skill)) fail(`illegal skill survived: ${row.skill}`);
  }
  console.log(`OK  write-time validation (${rows.length} valid rows kept, junk filtered)`);

  // ---- 1b. Cap enforcement -------------------------------------------------
  for (let i = 0; i < mod.MAX_ENTRIES + 60; i++) {
    await mod.recordBlockCompletion({
      day: (i % 180) + 1,
      blockKind: "practice",
      skills: ["grammar"],
      completed: true,
    });
  }
  const capped = await mod.getSkillTelemetry();
  if (capped.length !== mod.MAX_ENTRIES) {
    fail(`cap broken: ${capped.length} rows (expected ${mod.MAX_ENTRIES})`);
  } else {
    console.log(`OK  cap enforced at ${mod.MAX_ENTRIES}`);
  }

  // ---- 1c. Aggregations -----------------------------------------------------
  const sample = [
    { timestamp: 1, day: 5, blockKind: "listening", skill: "listening", completed: true },
    { timestamp: 2, day: 5, blockKind: "lesson", skill: "vocabulary", completed: true, difficultyFeedback: "偏难" },
    { timestamp: 3, day: 6, blockKind: "drill", skill: "phonics", completed: false },
  ];
  const summary = mod.summarizeTelemetry(sample);
  if (summary.total !== 3) fail("summary total wrong");
  if (summary.bySkill[0].skill !== "listening" || summary.bySkill[0].count !== 1) {
    fail("summary bySkill unexpected: " + JSON.stringify(summary.bySkill));
  }
  if (summary.byDay.find((row) => row.day === 5)?.total !== 2) fail("summary byDay wrong");
  if (summary.hardFeedbackByDay.find((row) => row.day === 5)?.count !== 1) {
    fail("summary hard feedback wrong");
  }
  console.log("OK  aggregation consistency (bySkill/byDay/hardFeedback)");

  // ---- 2. Static: call sites must pass a skills list ----------------------
  const studySource = fs.readFileSync(
    path.join(__dirname, "..", "src", "pages", "StudyPage.tsx"),
    "utf8",
  );
  const callSites = studySource.match(/recordBlockCompletion\(\{/g) ?? [];
  const withSkills = studySource.match(/skills:/g) ?? [];
  if (callSites.length === 0) fail("no telemetry call sites found in StudyPage.tsx");
  if (withSkills.length < callSites.length) {
    fail(`${callSites.length} call sites but only ${withSkills.length} pass a skills list`);
  }
  console.log(`OK  static check: ${withSkills.length}/${callSites.length} call sites pass explicit skills`);

  // ---- 3. Live log hygiene --------------------------------------------------
  const invalidRatio = await mod.getEmptyOrInvalidSkillRatio();
  if (invalidRatio > 5) {
    fail(`empty/invalid skill ratio too high: ${invalidRatio}% (max 5%)`);
  } else {
    console.log(`OK  empty/invalid skill ratio: ${invalidRatio}% (<= 5%)`);
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\nFailures: ${failures.length}`);
  failures.forEach((f) => console.log("  FAIL " + f));
  process.exit(failures.length === 0 ? 0 : 2);
})().catch((err) => {
  console.error("checker crashed:", err);
  process.exit(1);
});
