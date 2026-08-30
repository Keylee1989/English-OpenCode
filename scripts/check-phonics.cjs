const fs = require("fs");
const VALID = new Set(["sh","ch","th-vl","th-vd","ng","wh","h","r","l","w","y-cons","v","z","j","a-short","e-short","i-short","o-short","u-short","ee","ai","igh","oa","oo-l","oo-s","ow-2","oi","ar","or","er","al","bl","br","dr","tr","gr","pl","st","sp","sl","fl"]);
const PAIRS = new Set(["pair-eat-it","pair-live-leave","pair-work-walk","pair-three-tree","pair-bad-bed","pair-cat-cut","pair-full-food","pair-sit-seat"]);
const path = require("path");
const dir = "src/content/pipeline";
for (const f of fs.readdirSync(dir)) {
  if (!f.startsWith("plan-")) continue;
  const s = fs.readFileSync(path.join(dir, f), "utf8");
  for (const m of s.matchAll(/phonicsRuleIds:\s*\[([^\]]*)\]/g)) {
    for (const t of m[1].matchAll(/"([^"]+)"/g)) {
      if (!VALID.has(t[1])) console.log(`${f}: bad rule "${t[1]}"`);
    }
  }
  for (const m of s.matchAll(/phonicsPairId:\s*"([^"]+)"/g)) {
    if (!PAIRS.has(m[1])) console.log(`${f}: bad pair "${m[1]}"`);
  }
}
console.log("phonics scan done");
