/**
 * Phase 21 — runtime smoke: buildAdaptiveDiagnosis() against a real (fake) DB.
 * Run: node scripts/smoke-diagnosis.cjs
 * Verifies the closed-loop loader actually executes (no baseline path + the
 * ability-DB path) and returns a well-formed AdaptiveDiagnosis.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
require("fake-indexeddb/auto");
const { build } = require("esbuild");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "smoke21-"));
  const entry = path.join(tmp, "e.ts");
  const outfile = path.join(tmp, "b.mjs");
  fs.writeFileSync(entry, [
    'export { buildAdaptiveDiagnosis } from "@/study/adaptive/adaptive-runtime";',
  ].join("\n"));
  await build({
    entryPoints: [entry], outfile,
    bundle: true, format: "esm", platform: "node", target: "node18",
    alias: { "@": SRC }, logLevel: "silent",
  });
  let p = outfile.split(path.sep).join("/");
  if (!p.startsWith("/")) p = "/" + p;
  const mod = await import("file://" + p);

  try {
    const diag = await mod.buildAdaptiveDiagnosis({ minutes: 45 });
    console.log("OK hasBaseline=" + diag.hasBaseline);
    if (diag.profile) {
      console.log("OK profile skills:");
      for (const s of diag.profile.skills) {
        console.log(`   ${s.skill} band=${s.band} score=${s.score} conf=${s.confidence} selfRepo=${s.selfReported}`);
      }
    }
    console.log("OK profile=" + (diag.profile ? "yes" : "no") + " skills=" + (diag.profile ? diag.profile.skills.length : 0));
    console.log("OK priorities=" + diag.priorities.length);
    console.log("OK plan=" + (diag.plan ? "yes (" + diag.plan.totalMinutes + " min, " + diag.plan.blocks.length + " blocks)" : "no"));
    console.log("OK difficulty keys=" + Object.keys(diag.difficulty).length);
    console.log("OK dueReviewCount=" + diag.dueReviewCount);
    console.log("OK honestyLabel: " + diag.honestyLabel.slice(0, 40) + "…");
    console.log("SMOKE PASS");
  } catch (err) {
    console.error("SMOKE FAIL:", err);
    process.exit(1);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
})().catch((err) => { console.error("harness crashed:", err); process.exit(1); });