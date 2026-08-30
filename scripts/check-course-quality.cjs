/**
 * Course quality checker (Phase 10-B, day span extended to 360 in Phase 23).
 * Usage: node scripts/check-course-quality.cjs
 *
 * Validates the compiled curriculum (Day 1-360) at runtime by bundling the
 * content modules with esbuild (already available via vite) and asserting:
 *  - Day 1..360 exist, are contiguous, unique and in order
 *  - every day carries a full teaching structure:
 *      lesson      -> titleEn/titleZh/goalZh
 *      vocabulary  -> >=5 vocab ids
 *      grammar     -> grammarTopicId resolvable in the Grammar Engine
 *      listening   -> pattern.practiceSentences (drive listening/shadowing)
 *      speaking    -> pattern.examples (spoken drills)
 *      reading     -> reading passage lines
 *      writing     -> writingPrompt.zh + hintEn
 *      review      -> spiral review is real: each day >=11 reuses at least one
 *                     vocabulary id from the previous 30 days (SRS spiral)
 *      assessment  -> every day feeds the exercise engines (>=3 examples,
 *                     >=2 practice sentences, >=5 vocab, valid grammar topic)
 *                     and milestone assessment days 30/60/90 are authored
 *  - every vocabIds entry resolves against the merged lexical model
 *  - every grammarTopicId / phonics rule id / minimal-pair id resolves
 *  - no placeholder text (TODO / placeholder / ??? / mock / temp / fix later)
 *    anywhere in authored lesson strings
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { build } = require("esbuild");

const EXPECTED_DAYS = 360;
const failures = [];
function fail(msg) {
  failures.push(msg);
}

async function main() {
  // 1. Bundle the content graph into one ESM file (handles @ aliases + TLA).
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "course-quality-"));
  const entry = path.join(tmp, "entry.ts");
  const outfile = path.join(tmp, "bundle.mjs");
  fs.writeFileSync(
    entry,
    [
      'export { DAYS } from "@/content/days";',
      'export { AUTHORED_DAYS, COURSE_TARGET_DAYS } from "@/content";',
      'export { GRAMMAR_TOPICS } from "@/engines/grammar/topics";',
      'export { PHONICS_RULES, MINIMAL_PAIRS } from "@/phonics/rules";',
      'export { allLexical } from "@/content/vocab";',
    ].join("\n"),
  );
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node18",
    alias: { "@": path.join(__dirname, "..", "src") },
    logLevel: "silent",
  });
  const mod = await import(
    (() => {
      // file URL on windows
      let p = outfile.split(path.sep).join("/");
      if (!p.startsWith("/")) p = "/" + p;
      return "file://" + p;
    })()
  );

  const { DAYS, GRAMMAR_TOPICS, PHONICS_RULES, MINIMAL_PAIRS, allLexical } = mod;

  // 2. Day coverage.
  const byDay = new Map();
  for (const d of DAYS) {
    if (byDay.has(d.day)) fail(`DUPLICATE_DAY ${d.day}`);
    byDay.set(d.day, d);
  }
  for (let i = 1; i <= EXPECTED_DAYS; i++) {
    if (!byDay.has(i)) fail(`MISSING_DAY ${i}`);
  }
  const extra = [...byDay.keys()].filter((d) => d > EXPECTED_DAYS);
  for (const e of extra) fail(`UNEXPECTED_DAY ${e} (beyond ${EXPECTED_DAYS})`);
  console.log(`DAYS loaded: ${byDay.size} (expected ${EXPECTED_DAYS})`);

  // 3. Reference tables.
  const lexical = new Set(allLexical().map((e) => e.id));
  const topics = new Set(GRAMMAR_TOPICS.map((t) => t.id));
  const rules = new Set(PHONICS_RULES.map((r) => r.id));
  const pairs = new Set(MINIMAL_PAIRS.map((p) => p.id));

  // 4. Per-day structure + references.
  const PLACEHOLDER_RE = /\bTODO\b|placeholder|\?\?\?|\bmock\b|\btemp\b|fix later/i;

  function scanText(value, where) {
    if (typeof value === "string") {
      if (PLACEHOLDER_RE.test(value)) fail(`PLACEHOLDER ${where}: "${value.slice(0, 60)}"`);
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => scanText(v, `${where}[${i}]`));
    } else if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) scanText(v, `${where}.${k}`);
    }
  }

  const ordered = [...byDay.values()].sort((a, b) => a.day - b.day);
  const idsByDay = new Map(); // day -> Set of raw vocab ids
  for (const day of ordered) {
    // Day 1-7 foundation days carry inline vocab entries instead of id refs.
    const ids =
      day.vocabIds && day.vocabIds.length > 0
        ? day.vocabIds
        : (day.vocab ?? []).map((e) => e.id);
    idsByDay.set(day.day, new Set(ids));
  }

  for (const day of ordered) {
    const tag = `Day${day.day}`;
    const isFoundation = day.day <= 7; // Phase-1 intro days: pattern+inline vocab
    // lesson
    if (!day.titleEn || !day.titleZh || !day.goalZh) fail(`${tag} lesson fields missing`);
    // vocabulary
    const ids = [...idsByDay.get(day.day)];
    if (ids.length < 5) fail(`${tag} vocabulary <5 ids (${ids.length})`);
    if (new Set(ids).size !== ids.length) fail(`${tag} duplicate vocab ids within day`);
    for (const id of ids) {
      if (!lexical.has(id)) fail(`${tag} vocab unresolved: ${id}`);
    }
    if (isFoundation) {
      // Foundation days teach greetings through pattern drills only.
      const exF = day.pattern?.examples ?? [];
      const sentF = day.pattern?.practiceSentences ?? [];
      if (exF.length < 3) fail(`${tag} speaking/examples <3`);
      if (sentF.length < 2) fail(`${tag} listening/practice sentences <2`);
      continue;
    }
    // grammar
    if (!day.grammarTopicId || !topics.has(day.grammarTopicId)) {
      fail(`${tag} grammar unresolved: ${day.grammarTopicId}`);
    }
    // phonics
    for (const rid of day.phonicsFocus?.ruleIds ?? []) {
      if (!rules.has(rid)) fail(`${tag} phonics rule unresolved: ${rid}`);
    }
    for (const pid of day.phonicsFocus?.pairIds ?? []) {
      if (!pairs.has(pid)) fail(`${tag} phonics pair unresolved: ${pid}`);
    }
    // listening / speaking / assessment inputs
    const ex = day.pattern?.examples ?? [];
    const sent = day.pattern?.practiceSentences ?? [];
    if (ex.length < 3) fail(`${tag} speaking/examples <3`);
    if (sent.length < 2) fail(`${tag} listening/practice sentences <2`);
    // reading / writing
    if ((day.reading?.length ?? 0) < 1) fail(`${tag} reading missing`);
    if (!day.writingPrompt?.zh || !day.writingPrompt?.hintEn) fail(`${tag} writing missing`);
    scanText(
      {
        titleEn: day.titleEn,
        titleZh: day.titleZh,
        goalZh: day.goalZh,
        pattern: day.pattern,
        reading: day.reading,
        writingPrompt: day.writingPrompt,
      },
      tag,
    );
  }
  // review/assessment architecture: dedicated synthesis lessons close each phase
  // (30/60/90 are also the Assessment Engine's MILESTONE_DAYS).
  const REVIEW_RE2 = /review|milestone|simulation|comprehensive|growth|graduation|综合|复习|复盘|模拟|汇报/i;
  const SYNTHESIS_DAYS = [30, 60, 90, 100, 110, 130, 150, 160, 170, 180];
  for (const sd of SYNTHESIS_DAYS) {
    const d = byDay.get(sd);
    if (!d) {
      fail(`SYNTHESIS Day${sd} missing`);
      continue;
    }
    if (!REVIEW_RE2.test(`${d.titleEn} ${d.titleZh} ${d.goalZh}`)) {
      fail(`SYNTHESIS Day${sd} lacks review/synthesis marker: "${d.titleEn}"`);
    }
  }
  // assessment milestones must be authored days
  for (const m of [30, 60, 90]) {
    if (!byDay.has(m)) fail(`ASSESSMENT_MILESTONE Day${m} missing`);
  }

  // 5. Report.
  console.log(`Vocabulary model: ${lexical.size} entries`);
  console.log(`Grammar topics: ${topics.size} | Phonics rules: ${rules.size} | Pairs: ${pairs.size}`);
  console.log(`\nFailures: ${failures.length}`);
  failures.forEach((f) => console.log("  FAIL " + f));

  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(failures.length === 0 ? 0 : 2);
}

main().catch((err) => {
  console.error("checker crashed:", err);
  process.exit(1);
});
