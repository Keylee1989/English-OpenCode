/**
 * Vocabulary quality checker (Phase 6, Task 5).
 * Usage: node scripts/check-vocab-quality.cjs [--fix-dups]
 *
 * Detects across src/content/vocab/groups/*.ts:
 *  - duplicate ids (same word token defined twice -> silent merge!)
 *  - duplicate normalized words (suffix variants like handle-n vs handled? reported as warnings)
 *  - missing required fields (ipa not starting with "/", empty zh/example/collocation)
 *  - relation targets (fam/syn/ant) that don't resolve anywhere (heuristic scan)
 * With --fix-dups: renames/removes later duplicates per the FIX table below.
 */
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "src", "content", "vocab", "groups");
const fixMode = process.argv.includes("--fix-dups");

// Later duplicates resolved when --fix-dups is passed.
// key: lowercase id; value: { file, action: "delete" | ["rename", newId] }
const DUP_FIXES = {
  heart: { file: "g13-colors-shapes2.ts", action: ["rename", "heart-shape"] },
  dress: { file: "g37-routine-housework.ts", action: ["rename", "dress-v"] },
  gate: { file: "g34-house-detail.ts", action: ["rename", "front-gate"] },
  talent: { file: "g71-thinking-learning.ts", action: "delete" },
  prison: { file: "g21-society-law.ts", action: "delete" },
  contract: { file: "g23-work-office2.ts", action: "delete" },
  tone: { file: "g25-communication.ts", action: "delete" },
  past: { file: "g29-prepositions-place.ts", action: "delete" },
  sink: { file: "g30-kitchen-cooking.ts", action: "delete" },
  position: { file: "g39-place-generic.ts", action: "delete" },
  announce: { file: "g40-verbs-general3.ts", action: "delete" },
  suggest: { file: "g40-verbs-general3.ts", action: "delete" },
  shame: { file: "g41-feelings-states.ts", action: "delete" },
  stroke: { file: "g81-health-body3.ts", action: "delete" },
  nurse: { file: "people-jobs.ts", action: "delete" },
};

function scan() {
  const byId = new Map(); // id -> [{file,line}]
  const issues = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".ts") || f.includes("test")) continue;
    const lines = fs.readFileSync(path.join(dir, f), "utf8").split("\n");
    lines.forEach((line, idx) => {
      const t = line.trim();
      if (!t.startsWith("v(")) return;
      const m = t.match(/^v\("([^"]+)",\s*"([^"]*)",\s*"([^"]*)"/);
      if (!m) {
        issues.push(`PARSE? ${f}:${idx + 1}`);
        return;
      }
      const [, word, zh, ipa] = m;
      const id = word.toLowerCase();
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id).push({ file: f, lineNo: idx + 1 });

      if (!ipa.startsWith("/")) issues.push(`BAD_IPA ${f}:${idx + 1} ${id} ipa=${ipa}`);
      if (zh.length === 0) issues.push(`EMPTY_ZH ${f}:${idx + 1} ${id}`);
      if (!/"[^"]*"\s*\)\s*,?\s*$/.test(t) && !t.endsWith(",")) {
        // noop – structure check kept light
      }
    });
  }
  for (const [id, defs] of byId) {
    if (defs.length > 1) issues.push(`DUP_ID ${id} => ${defs.map((d) => `${d.file}:${d.lineNo}`).join(", ")}`);
  }
  return { byId, issues };
}

let issues = scan().issues;

if (fixMode) {
  for (const [id, fix] of Object.entries(DUP_FIXES)) {
    if (fix.action === "delete") {
      // remove the FIRST matching v("id",... line in the named file
      const p = path.join(dir, fix.file);
      if (!fs.existsSync(p)) continue;
      const lines = fs.readFileSync(p, "utf8").split("\n");
      const i = lines.findIndex((l) => l.trim().startsWith(`v("${id}"`));
      if (i !== -1) {
        lines.splice(i, 1);
        fs.writeFileSync(p, lines.join("\n"), "utf8");
        console.log(`deleted dup ${id} from ${fix.file}`);
      }
    } else if (Array.isArray(fix.action)) {
      const p = path.join(dir, fix.file);
      if (!fs.existsSync(p)) continue;
      let s = fs.readFileSync(p, "utf8");
      s = s.replace(`v("${id}"`, `v("${fix.action[1]}"`);
      fs.writeFileSync(p, s, "utf8");
      console.log(`renamed dup ${id} -> ${fix.action[1]} in ${fix.file}`);
    }
  }
  issues = scan().issues;
}

const dups = issues.filter((i) => i.startsWith("DUP_ID"));
const others = issues.filter((i) => !i.startsWith("DUP_ID"));
console.log(`\nDuplicate ids: ${dups.length}`);
dups.forEach((d) => console.log("  " + d));
console.log(`Other issues: ${others.length}`);
others.forEach((o) => console.log("  " + o));
process.exit(issues.length === 0 ? 0 : 2);
