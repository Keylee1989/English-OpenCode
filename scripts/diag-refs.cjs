// Diagnose unresolved vocab ids per day using ts via vitest-free regex over plans + model ids
const fs = require("fs");
const path = require("path");

function idsFrom(file) {
  const s = fs.readFileSync(path.join("src/content/vocab/groups", file), "utf8");
  const set = new Set();
  for (const m of s.matchAll(/\bv\("([^"]+)"/g)) set.add(m[1].toLowerCase());
  return set;
}

// model ids = all group files
const dir = "src/content/vocab/groups";
const all = new Set();
for (const f of fs.readdirSync(dir)) {
  if (f.includes("test")) continue;
  for (const id of idsFrom(f)) all.add(id);
}
// day1-7 inline
const dayDir = "src/content/days";
for (const f of fs.readdirSync(dayDir).filter((x) => /^day\d\.ts$/.test(x))) {
  const c = fs.readFileSync(path.join(dayDir, f), "utf8");
  for (const m of c.matchAll(/id:\s*"w:([a-z0-9'-]+)"/g)) all.add(m[1]);
}

function check(planFile, range) {
  const s = fs.readFileSync(path.join("src/content/pipeline", planFile), "utf8");
  for (const m of s.matchAll(/day: (\d+)[\s\S]*?vocabIds:\s*\[([^\]]*)\]/g)) {
    const day = Number(m[1]);
    if (day < range[0] || day > range[1]) continue;
    const refs = [...m[2].matchAll(/"w:([^"]+)"/g)].map((x) => x[1].toLowerCase());
    const missing = refs.filter((id) => !all.has(id));
    if (missing.length) console.log(`d${day} missing: ${missing.join(", ")}`);
  }
}

check("plan-91-120.ts", [91, 100]);
check("plan-101-110.ts", [101, 110]);
console.log("diag done");
