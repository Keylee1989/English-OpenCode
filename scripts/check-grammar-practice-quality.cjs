/**
 * Phase 18 P0: check-grammar-practice-quality.cjs
 * Verifies grammar practice coverage and exercise quality.
 */
const path = require("path");
require("fake-indexeddb/auto");
const { build } = require("esbuild");

(async () => {
  const fs = require("fs"), os = require("os");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gpg-"));
  const entry = path.join(tmp, "e.ts");
  const outfile = path.join(tmp, "b.mjs");
  fs.writeFileSync(entry, [
    'export { GRAMMAR_PRACTICE_DATA, getGrammarPracticeCoverage } from "@/content/grammar/practice/grammar-practice";',
    'export { GRAMMAR_C2_TOPICS } from "@/content/grammar/c2/grammar-c2";',
  ].join("\n"));
  await build({ entryPoints: [entry], outfile, bundle: true, format: "esm", platform: "node", target: "node18", alias: { "@": path.join(process.cwd(), "src") }, logLevel: "silent" });
  let p = outfile.split(path.sep).join("/");
  if (!p.startsWith("/")) p = "/" + p;
  const mod = await import("file://" + p);

  const failures = [];
  function fail(msg) { failures.push(msg); }

  // Coverage check
  const c2Topics = mod.GRAMMAR_C2_TOPICS ?? [];
  const practiceTopics = new Set((mod.GRAMMAR_PRACTICE_DATA ?? []).map((t) => t.topicId));
  for (const topic of c2Topics) {
    if (!practiceTopics.has(topic.id)) fail(`No practice data for topic: ${topic.id}`);
  }
  console.log(`C2 topics: ${c2Topics.length} | Practice topics: ${practiceTopics.size}`);

  // Exercise quality
  let totalExercises = 0;
  for (const pt of mod.GRAMMAR_PRACTICE_DATA ?? []) {
    if (!pt.exercises?.length) { fail(`${pt.topicId}: no exercises`); continue; }
    totalExercises += pt.exercises.length;
    for (const ex of pt.exercises) {
      if (![1, 2, 3].includes(ex.level)) fail(`${pt.topicId}: bad level ${ex.level}`);
      if (!ex.answer) fail(`${pt.topicId}: missing answer`);
      if (!ex.explanationZh) fail(`${pt.topicId}: missing explanationZh`);
      if (!ex.promptEn) fail(`${pt.topicId}: missing promptEn`);
    }
  }

  // Category coverage
  const coverage = mod.getGrammarPracticeCoverage?.() ?? [];
  console.log(`Practice categories covered: ${coverage.filter(c => c.covered).length}`);

  console.log(`Total grammar practice exercises: ${totalExercises}`);
  console.log(`\nFailures: ${failures.length}`);
  failures.forEach((f) => console.log("  FAIL " + f));
  process.exit(failures.length === 0 ? 0 : 2);
})().catch((err) => {
  console.error("checker crashed:", err);
  process.exit(1);
});
