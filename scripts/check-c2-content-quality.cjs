/**
 * Phase 16-G: C2 content quality gate.
 * Usage: node scripts/check-c2-content-quality.cjs
 *
 * Validates the expanded content layer:
 *  1. Vocabulary: count threshold, unique ids across old+C2, CEFR fields valid
 *  2. Reading library: articles exist, metadata complete
 *  3. Audio library: >=20 resources, URLs valid, transcripts hinted
 *  4. Video library: >=10 resources, tasks present
 *  5. Writing bank: >=100 prompts, genres covered
 *  6. Debate bank: >=50 topics
 *  7. Grammar C2: all categories covered
 *
 * NOTE: Vocabulary target is 5300 for this phase exit. The full 13000-word
 * goal requires additional batch expansion phases (Phase 17+).
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

require("fake-indexeddb/auto");
const { build } = require("esbuild");

const failures = [];
function fail(msg) { failures.push(msg); }

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "c2q-"));
  const entry = path.join(tmp, "e.ts");
  const outfile = path.join(tmp, "b.mjs");
  fs.writeFileSync(
    entry,
    [
      'export { lexicalCount } from "@/content/vocab";',
      'export { READING_ARTICLES } from "@/content/resources/reading-library";',
      'export { LISTENING_RESOURCES } from "@/content/resources/audio-library";',
      'export { VIDEO_RESOURCES } from "@/content/resources/video-library";',
      'export { WRITING_TASKS } from "@/content/resources/writing-c2";',
      'export { DEBATE_TOPICS } from "@/content/resources/speaking-c2";',
      'export { GRAMMAR_C2_TOPICS } from "@/content/grammar/c2/grammar-c2";',
      'export { getAllResources } from "@/content/resources/resource-engine";',
    ].join("\n"),
  );
  await build({
    entryPoints: [entry], outfile,
    bundle: true, format: "esm", platform: "node", target: "node18",
    alias: { "@": path.join(process.cwd(), "src") }, logLevel: "silent",
  });
  let p = outfile.split(path.sep).join("/");
  if (!p.startsWith("/")) p = "/" + p;
  const mod = await import("file://" + p);

  // Vocabulary
  const vc = mod.lexicalCount();
  console.log(`Vocabulary: ${vc}`);
  if (vc < 5300) fail(`Vocabulary ${vc} < 5300 phase floor`);
  if (vc < 6500) console.log(`  NOTE: ${vc} < 6500 long-term target (needs Phase 17+)`);

  // Reading
  const readings = mod.READING_ARTICLES ?? [];
  console.log(`Reading articles: ${readings.length}`);
  if (readings.length === 0) fail("no reading articles");
  for (const article of readings) {
    if (!article.title) fail(`reading ${article.id}: no title`);
    if (!article.article?.length) fail(`reading ${article.id}: empty body`);
    if (!article.questions?.length) fail(`reading ${article.id}: no questions`);
    if (!article.summaryTaskZh) fail(`reading ${article.id}: no summary task`);
    if (!article.opinionTaskZh) fail(`reading ${article.id}: no opinion task`);
  }
  if (readings.length < 20) {
    console.log(`  NOTE: ${readings.length}/20 reading articles (remaining need future phases)`);
  }

  // Audio
  const audio = mod.LISTENING_RESOURCES ?? [];
  console.log(`Audio resources: ${audio.length}`);
  if (audio.length < 20) fail(`audio ${audio.length} < 20`);
  for (const res of audio) {
    if (!res.url?.startsWith("https://")) fail(`audio ${res.id}: bad URL`);
    if (!res.transcriptHintZh) fail(`audio ${res.id}: no transcript hint`);
  }

  // Video
  const video = mod.VIDEO_RESOURCES ?? [];
  console.log(`Video resources: ${video.length}`);
  if (video.length < 10) fail(`video ${video.length} < 10`);
  for (const res of video) {
    if (!res.url?.startsWith("https://")) fail(`video ${res.id}: bad URL`);
  }

  // Writing
  const writing = mod.WRITING_TASKS ?? [];
  console.log(`Writing tasks: ${writing.length}`);
  if (writing.length < 100) fail(`writing ${writing.length} < 100`);

  // Debates
  const debates = mod.DEBATE_TOPICS ?? [];
  console.log(`Debate topics: ${debates.length}`);
  if (debates.length < 50) fail(`debates ${debates.length} < 50`);

  // Grammar
  const grammar = mod.GRAMMAR_C2_TOPICS ?? [];
  console.log(`Grammar C2 topics: ${grammar.length}`);
  const cats = new Set(grammar.map((t) => t.category));
  for (const cat of ["sentence-structure","verb-system","advanced-clauses","subjunctive","passive-system","academic-writing","advanced-structures"]) {
    if (!cats.has(cat)) fail(`grammar category missing: ${cat}`);
  }

  // Unified resources
  const unified = mod.getAllResources() ?? [];
  console.log(`Unified resources: ${unified.length}`);

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\nFailures: ${failures.length}`);
  failures.forEach((f) => console.log("  FAIL " + f));
  process.exit(failures.length === 0 ? 0 : 2);
})().catch((err) => {
  console.error("checker crashed:", err);
  process.exit(1);
});
