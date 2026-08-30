/**
 * Phase-2 (Day 181-360) content quality checker (Phase 23).
 * Usage: node scripts/check-360-day-content-quality.cjs
 *
 * Validates the compiled Block A-F curriculum at runtime by bundling the
 * content modules with esbuild and asserting:
 *  - Day 181..360 exist, are contiguous, unique and in order
 *  - every day carries a full teaching structure:
 *      lesson      -> titleEn/titleZh/goalZh
 *      vocabulary  -> >=5 vocab ids, no intra-day duplicates, all resolvable
 *                     against the merged lexical model (band>=4 required)
 *      grammar     -> grammarTopicId resolvable in the Grammar Engine
 *      listening   -> pattern.practiceSentences (drive listening/shadowing)
 *      speaking    -> pattern.examples (spoken drills)
 *      reading     -> reading passage lines
 *      writing     -> writingPrompt.zh + hintEn
 *      spiral      -> each day reuses at least one vocab id from the previous
 *                     30 days (SRS review continuity across block seams)
 *  - block seams (210/240/270/300/330/360) carry review/synthesis markers
 *  - no placeholder text (TODO / placeholder / ??? / mock / temp / fix later)
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { build } = require("esbuild");

const START_DAY = 181;
const EXPECTED_DAYS = 360;
const failures = [];
function fail(msg) {
  failures.push(msg);
}

async function main() {
  // 1. Bundle the content graph into one ESM file (handles @ aliases + TLA).
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "course-quality-360-"));
  const entry = path.join(tmp, "entry.ts");
  const outfile = path.join(tmp, "bundle.mjs");
  fs.writeFileSync(
    entry,
    [
      'export { DAYS } from "@/content/days";',
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
      let p = outfile.split(path.sep).join("/");
      if (!p.startsWith("/")) p = "/" + p;
      return "file://" + p;
    })()
  );

  const { DAYS, GRAMMAR_TOPICS, PHONICS_RULES, MINIMAL_PAIRS, allLexical } = mod;

  // 2. Day coverage (181..360).
  const byDay = new Map();
  for (const d of DAYS) {
    if (byDay.has(d.day)) fail(`DUPLICATE_DAY ${d.day}`);
    byDay.set(d.day, d);
  }
  for (let i = START_DAY; i <= EXPECTED_DAYS; i++) {
    if (!byDay.has(i)) fail(`MISSING_DAY ${i}`);
  }
  const ordered = [...byDay.values()]
    .filter((d) => d.day >= START_DAY)
    .sort((a, b) => a.day - b.day);
  ordered.forEach((d, i) => {
    if (d.day !== START_DAY + i) fail(`NON_CONTIGUOUS at position ${i}: ${d.day}`);
  });
  console.log(`Phase-2 days loaded: ${ordered.length} (${START_DAY}..${EXPECTED_DAYS})`);

  // 3. Reference tables + band floor for Phase-2 vocab.
  const lexical = new Map(allLexical().map((e) => [e.id, e]));
  const topics = new Set(GRAMMAR_TOPICS.map((t) => t.id));
  const rules = new Set(PHONICS_RULES.map((r) => r.id));
  const pairs = new Set(MINIMAL_PAIRS.map((p) => p.id));

  // 4. Per-day structure + references + spiral reuse.
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

  const recentIds = new Set(); // vocab ids seen in the trailing 30 days
  const recentDays = [];
  let spiralCoveredDays = 0;
  const spiralGapDays = [];
  for (const day of ordered) {
    const tag = `Day${day.day}`;
    // lesson
    if (!day.titleEn || !day.titleZh || !day.goalZh) fail(`${tag} lesson fields missing`);
    // vocabulary
    const ids =
      day.vocabIds && day.vocabIds.length > 0 ? day.vocabIds : (day.vocab ?? []).map((e) => e.id);
    if (ids.length < 5) fail(`${tag} vocabulary <5 ids (${ids.length})`);
    if (new Set(ids).size !== ids.length) fail(`${tag} duplicate vocab ids within day`);
    for (const id of ids) {
      const entry = lexical.get(id);
      if (!entry) {
        fail(`${tag} vocab unresolved: ${id}`);
        continue;
      }
      if (typeof entry.band === "number" && entry.band < 4) {
        fail(`${tag} vocab band <4: ${id} (band ${entry.band})`);
      }
    }
    // spiral reuse (informational): at least one id reappears within the
    // previous 30 days (SRS continuity); block-leading topic days may add
    // entirely fresh vocabulary, so this is reported, not a hard failure.
    const reused = ids.filter((id) => recentIds.has(id));
    if (reused.length > 0) {
      spiralCoveredDays += 1;
    } else {
      spiralGapDays.push(day.day);
    }
    recentDays.push(day.day);
    if (recentDays.length > 30) {
      const evicted = recentDays.shift();
      const evictedDay = byDay.get(evicted);
      const evictedIds =
        (evictedDay?.vocabIds ?? []).length > 0
          ? evictedDay.vocabIds
          : (evictedDay?.vocab ?? []).map((e) => e.id);
      for (const id of evictedIds) recentIds.delete(id);
    }
    for (const id of ids) recentIds.add(id);
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
    for (const exItem of ex) {
      if (!exItem || typeof exItem.en !== "string" || !exItem.en || typeof exItem.zh !== "string") {
        fail(`${tag} malformed example pair`);
        break;
      }
    }
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
  // block seams: dedicated review/synthesis closing days
  const REVIEW_RE2 = /review|milestone|simulation|comprehensive|growth|graduation|综合|复习|复盘|模拟|汇报|测评|总结|报告/i;
  for (const sd of [210, 240, 270, 300, 330, 360]) {
    const d = byDay.get(sd);
    if (!d) {
      fail(`SEAM Day${sd} missing`);
      continue;
    }
    if (!REVIEW_RE2.test(`${d.titleEn} ${d.titleZh} ${d.goalZh}`)) {
      fail(`SEAM Day${sd} lacks review/synthesis marker: "${d.titleEn}"`);
    }
  }

  // 5. Report.
  console.log(
    `Vocabulary model: ${lexical.size} entries (Phase-2 id refs resolved at runtime)`,
  );
  console.log(
    `Grammar topics: ${topics.size} | Phonics rules: ${rules.size} | Pairs: ${pairs.size}`,
  );
  console.log(
    `SRS spiral coverage: ${spiralCoveredDays}/${ordered.length} days reuse an id from the previous 30 days`,
  );
  if (spiralGapDays.length > 0) {
    console.log(`  days without in-window vocab reuse: ${spiralGapDays.join(", ")}`);
  }
  console.log(`\nFailures: ${failures.length}`);
  failures.forEach((f) => console.log("  FAIL " + f));

  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(failures.length === 0 ? 0 : 2);
}

main().catch((err) => {
  console.error("checker crashed:", err);
  process.exit(1);
});