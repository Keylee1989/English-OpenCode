/**
 * Phase 19 Gate: check-learning-content-completeness.cjs
 * Usage: node scripts/check-learning-content-completeness.cjs
 *
 * Verifies the Phase 19 content-completion targets:
 *  - reading: >=23 articles total, >=18 of them in the 3000-5000 word range
 *  - grammar practice: 1250 exercises across 25 topics (50 each)
 *  - speaking: 1000 SPEAKING_TASKS across 6 categories with structure + phrases
 *  - listening: 50 resources, each upgraded with transcript note, dictation
 *    task and summary task (plus existing shadowing task)
 *  - writing: 100 tasks, each carrying a rubric (5 dimensions, 4 bands each)
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

require("fake-indexeddb/auto");
const { build } = require("esbuild");

const failures = [];
function fail(msg) {
  failures.push(msg);
}

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lcc-"));
  const entry = path.join(tmp, "entry.ts");
  const outfile = path.join(tmp, "bundle.mjs");
  fs.writeFileSync(
    entry,
    [
      'export { READING_ARTICLES } from "@/content/resources/reading-library";',
      'export { GRAMMAR_PRACTICE_DATA } from "@/content/grammar/practice/grammar-practice";',
      'export { SPEAKING_TASKS } from "@/content/resources/speaking-c2-p19";',
      'export { LISTENING_RESOURCES } from "@/content/resources/audio-library";',
      'export { WRITING_TASKS } from "@/content/resources/writing-c2";',
    ].join("\n"),
  );
  await build({
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

  // ---- reading: 18 new in-spec (3000-5000 words) articles --------------------
  const readings = mod.READING_ARTICLES ?? [];
  console.log(`Reading articles: ${readings.length}`);
  const inSpec = readings.filter((a) => a.wordCount >= 3000 && a.wordCount <= 5000);
  console.log(`  in 3000-5000 word range: ${inSpec.length}`);
  if (readings.length < 23) fail(`expected >=23 reading articles, got ${readings.length}`);
  if (inSpec.length < 18) fail(`expected >=18 in-spec (3000-5000w) articles, got ${inSpec.length}`);
  for (const article of readings) {
    if (!article.questions?.length) fail(`${article.id}: no questions`);
    if (!article.summaryTaskZh || !article.opinionTaskZh) fail(`${article.id}: output tasks missing`);
  }

  // ---- grammar practice: 1250 across 25 topics -------------------------------
  const practice = mod.GRAMMAR_PRACTICE_DATA ?? [];
  const topicExercises = new Map();
  for (const pt of practice) {
    if (!pt.exercises?.length) { fail(`${pt.topicId}: no exercises`); continue; }
    topicExercises.set(pt.topicId, pt.exercises.length);
    for (const ex of pt.exercises) {
      if (![1, 2, 3].includes(ex.level)) fail(`${pt.topicId}: bad exercise level`);
      if (!ex.promptEn || !ex.answer || !ex.explanationZh) fail(`${pt.topicId}: incomplete exercise`);
    }
  }
  const totalGrammar = [...topicExercises.values()].reduce((a, b) => a + b, 0);
  console.log(`Grammar practice topics: ${topicExercises.size}`);
  console.log(`  total exercises: ${totalGrammar}`);
  if (topicExercises.size < 25) fail(`expected 25 practice topics, got ${topicExercises.size}`);
  if (totalGrammar < 1250) fail(`expected >=1250 grammar exercises, got ${totalGrammar}`);
  for (const [topicId, n] of topicExercises) {
    if (n < 50) fail(`${topicId}: only ${n} exercises (need 50)`);
  }

  // ---- speaking: 1000 tasks across 6 categories --------------------------------
  const speaking = mod.SPEAKING_TASKS ?? [];
  const catCount = new Map();
  for (const task of speaking) {
    catCount.set(task.category, (catCount.get(task.category) || 0) + 1);
    if (!["B2", "C1", "C2"].includes(task.difficulty)) fail(`${task.id}: bad difficulty`);
    if (!task.prompt) fail(`${task.id}: missing prompt`);
    if (!(task.sampleStructure?.length > 0)) fail(`${task.id}: missing sample structure`);
    if (!(task.keyPhrases?.length > 0)) fail(`${task.id}: missing key phrases`);
  }
  console.log(`Speaking tasks: ${speaking.length}`);
  console.log(`  by category: ${[...catCount.entries()].map(([k, v]) => `${k}=${v}`).join(", ")}`);
  if (speaking.length < 1000) fail(`expected 1000 speaking tasks, got ${speaking.length}`);
  if (catCount.size < 6) fail(`expected 6 speaking categories, got ${catCount.size}`);

  // ---- listening: 50 resources, all upgraded -----------------------------------
  const audio = mod.LISTENING_RESOURCES ?? [];
  console.log(`Listening resources: ${audio.length}`);
  if (audio.length < 50) fail(`expected 50 listening resources, got ${audio.length}`);
  for (const res of audio) {
    if (!res.transcriptNoteZh) fail(`${res.id}: missing transcript note`);
    if (!res.dictationTaskZh) fail(`${res.id}: missing dictation task`);
    if (!res.summaryTaskZh) fail(`${res.id}: missing summary task`);
    if (!res.shadowingTaskZh) fail(`${res.id}: missing shadowing task`);
    if ((res.comprehensionPrompts ?? []).length < 2) fail(`${res.id}: comprehension prompts <2`);
  }

  // ---- writing: 100 tasks, all with rubric ---------------------------------------
  const writing = mod.WRITING_TASKS ?? [];
  console.log(`Writing tasks: ${writing.length}`);
  if (writing.length < 100) fail(`expected 100 writing tasks, got ${writing.length}`);
  for (const task of writing) {
    const r = task.rubric;
    if (!r || !Array.isArray(r.dimensions) || r.dimensions.length < 3) {
      fail(`${task.id}: missing/incomplete rubric`);
      continue;
    }
    for (const dim of r.dimensions) {
      if (!(dim.bands?.length >= 3)) fail(`${task.id}: rubric dimension missing bands`);
    }
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\nFailures: ${failures.length}`);
  failures.forEach((f) => console.log("  FAIL " + f));
  process.exit(failures.length === 0 ? 0 : 2);
})().catch((err) => {
  console.error("checker crashed:", err);
  process.exit(1);
});
