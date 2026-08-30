const fs = require("fs");
const p = "src/content/pipeline/plan-101-110.ts";
let s = fs.readFileSync(p, "utf8");
// strip invalid ids and fix invalid phonics ids
const fixes = [
  ['"w:tow? no", ', ''],
  ['"w:engine? no", ', ''],
  ['"w:tire? no", ', ''],
  ['["ank? no - use a-short", "ng"]', '["a-short", "ng"]'],
  ['"w:estimate-v? no", ', ''],
  ['["ee", "d? no - use t? no - use st"]', '["ee", "st"]'],
  ['["fr? no - use fl", "ee"]', '["fl", "ee"]'],
  ['["pr? no - use pl", "sh"]', '["pl", "sh"]'],
  ['"w:split-the-bill? no - use split", ', '"w:split", '],
  ['["sk? no - use sp", "ai"]', '["sp", "ai"]'],
  ['["n? no - use ng", "ai"]', '["ng", "ai"]'],
];
for (const [a, b] of fixes) {
  if (s.includes(a)) s = s.split(a).join(b);
  else console.error("MISS:", a);
}
fs.writeFileSync(p, s, "utf8");
console.log("bad left:", (s.match(/\? no|\? use/g) || []).length);
