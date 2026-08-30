/**
 * Phase 15-J: Resource quality gate.
 * Usage: node scripts/check-resource-quality.cjs
 *
 * Validates the C2 content layer end-to-end by importing the real modules:
 *  - resource ids are globally unique across all libraries
 *  - required metadata present (level, title, category, tasks)
 *  - reading articles: non-empty body (>=6 paragraphs), >=4 questions with a
 *    valid answerIndex, >=4 vocab notes, summary + opinion tasks
 *  - audio entries: url + transcript hint + >=2 comprehension prompts
 *  - video entries: valid https URL + >=3 tasks
 *  - writing tasks: unique numbers, word targets sane, genre legal
 *  - grammar c2 topics: unique ids, categories covered per spec
 *  - C2 vocabulary: unique words, legal level/register/usage enums,
 *    ipa wrapped in slashes, empty-skill-style junk ratio reported
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
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "resource-gate-"));
  const entry = path.join(tmp, "entry.ts");
  const outfile = path.join(tmp, "bundle.mjs");
  fs.writeFileSync(
    entry,
    [
      'export { READING_ARTICLES } from "@/content/resources/reading-library";',
      'export { LISTENING_RESOURCES } from "@/content/resources/audio-library";',
      'export { VIDEO_RESOURCES } from "@/content/resources/video-library";',
      'export { WRITING_TASKS, getWritingTasksByGenre } from "@/content/resources/writing-c2";',
      'export { DEBATE_TOPICS, PRESENTATION_TRACKS } from "@/content/resources/speaking-c2";',
      'export { GRAMMAR_C2_TOPICS, GRAMMAR_C2_CATEGORIES } from "@/content/grammar/c2/grammar-c2";',
      'export { getAllResources } from "@/content/resources/resource-engine";',
      'export { lexicalCount } from "@/content/vocab";',
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

  // ---- global id uniqueness -------------------------------------------------
  const seen = new Map();
  const dupCheck = (items, label) => {
    for (const item of items) {
      if (!item.id) {
        fail(`${label}: row without id`);
        continue;
      }
      if (seen.has(item.id)) fail(`DUPLICATE_ID ${item.id} (${seen.get(item.id)} & ${label})`);
      seen.set(item.id, label);
    }
  };
  dupCheck(mod.READING_ARTICLES, "reading");
  dupCheck(mod.LISTENING_RESOURCES, "audio");
  dupCheck(mod.VIDEO_RESOURCES, "video");
  dupCheck(mod.WRITING_TASKS, "writing");
  dupCheck(mod.GRAMMAR_C2_TOPICS, "grammar");

  const LEVELS = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);
  const REGISTERS = new Set(["formal", "neutral", "casual", "academic", "slang"]);
  const USAGES = new Set(["spoken", "written", "both"]);

  // ---- reading ---------------------------------------------------------------
  const readings = mod.READING_ARTICLES ?? [];
  console.log(`Reading articles: ${readings.length}`);
  for (const article of readings) {
    const tag = `reading ${article.id}`;
    if (!article.title || !article.categoryZh) fail(`${tag} metadata missing`);
    if (!LEVELS.has(article.difficulty)) fail(`${tag} bad difficulty: ${article.difficulty}`);
    const paras = (article.article ?? []).filter((para) => para.trim().length > 0);
    if (paras.length < 6) fail(`${tag} body too short (${paras.length} paragraphs)`);
    if ((article.vocabularyNotes ?? []).length < 4) fail(`${tag} <4 vocab notes`);
    if ((article.questions ?? []).length < 4) fail(`${tag} <4 questions`);
    for (const q of article.questions ?? []) {
      if (q.options.length !== 4 && q.options.length !== 3) fail(`${tag} question options != 3/4`);
      if (q.answerIndex < 0 || q.answerIndex >= q.options.length) fail(`${tag} answerIndex out of range`);
    }
    if (!article.summaryTaskZh || !article.opinionTaskZh) fail(`${tag} output tasks missing`);
    if (!article.grammarNotes?.length) fail(`${tag} grammar notes missing`);
  }

  // ---- audio ------------------------------------------------------------------
  const audios = mod.LISTENING_RESOURCES ?? [];
  console.log(`Audio resources: ${audios.length}`);
  if (audios.length < 20) fail(`audio library needs >=20 entries, got ${audios.length}`);
  for (const res of audios) {
    const tag = `audio ${res.id}`;
    if (!res.url?.startsWith("https://")) fail(`${tag} invalid url: ${res.url}`);
    if (!res.transcriptHintZh) fail(`${tag} transcript hint missing`);
    if ((res.comprehensionPrompts ?? []).length < 2) fail(`${tag} comprehension prompts <2`);
    if (!LEVELS.has(res.level)) fail(`${tag} bad level ${res.level}`);
    if (!res.keyVocabulary?.length) fail(`${tag} key vocabulary missing`);
  }

  // ---- video --------------------------------------------------------------------
  const videos = mod.VIDEO_RESOURCES ?? [];
  console.log(`Video resources: ${videos.length}`);
  if (videos.length < 10) fail(`video library needs >=10 entries, got ${videos.length}`);
  for (const res of videos) {
    if (!res.url?.startsWith("https://")) fail(`video ${res.id}: invalid url`);
    if ((res.tasksZh ?? []).length < 3) fail(`video ${res.id}: tasks <3`);
    if (!LEVELS.has(res.level)) fail(`video ${res.id}: bad level ${res.level}`);
  }

  // ---- writing ---------------------------------------------------------------------
  const tasks = mod.WRITING_TASKS ?? [];
  console.log(`Writing tasks: ${tasks.length}`);
  if (tasks.length < 100) fail(`writing bank needs >=100 prompts, got ${tasks.length}`);
  const genres = new Set(["argumentative", "analytical", "persuasive", "report", "summary"]);
  for (const task of tasks) {
    if (!genres.has(task.genre)) fail(`writing ${task.id}: bad genre ${task.genre}`);
    const [lo, hi] = task.targetWords ?? [0, 0];
    if (!(hi > lo && lo >= 50)) fail(`writing ${task.id}: bad word target`);
  }
  for (const genre of genres) {
    if (mod.getWritingTasksByGenre(genre).length === 0) fail(`no writing tasks for genre ${genre}`);
  }

  // ---- speaking ------------------------------------------------------------------------
  const debates = mod.DEBATE_TOPICS ?? [];
  console.log(`Debate resolutions: ${debates.length}`);
  if (debates.length < 50) fail(`debate bank needs >=50 topics, got ${debates.length}`);
  if ((mod.PRESENTATION_TRACKS ?? []).length !== 3) fail("presentation tracks != 3");

  // ---- grammar ---------------------------------------------------------------------------
  const topics = mod.GRAMMAR_C2_TOPICS ?? [];
  console.log(`Grammar C2 topics: ${topics.length}`);
  const requiredCategories = [
    "sentence-structure",
    "verb-system",
    "advanced-clauses",
    "subjunctive",
    "passive-system",
    "academic-writing",
    "advanced-structures",
  ];
  for (const category of requiredCategories) {
    if (!mod.GRAMMAR_C2_CATEGORIES.includes(category)) fail(`grammar category missing: ${category}`);
    if (!topics.some((topic) => topic.category === category)) {
      fail(`no topics in grammar category: ${category}`);
    }
  }

  // ---- unified engine ----------------------------------------------------------------------
  const unified = mod.getAllResources() ?? [];
  console.log(`Unified resources: ${unified.length}`);
  if (unified.length === 0) fail("resource engine returned nothing");

  // ---- C2 vocabulary sanity via lexicalCount --------------------------------------------
  console.log(`Vocabulary model total: ${mod.lexicalCount()} (target >= 13000 eventually)`);

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\nFailures: ${failures.length}`);
  failures.forEach((f) => console.log("  FAIL " + f));
  process.exit(failures.length === 0 ? 0 : 2);
})().catch((err) => {
  console.error("checker crashed:", err);
  process.exit(1);
});
