const fs = require("fs");
const p = "src/content/pipeline/plan-91-120.ts";
let s = fs.readFileSync(p, "utf8");

const fixes = [
  ['["w:complain? no", "w:issue", "w:fix", "w:apologize"]', '["w:issue", "w:fix", "w:apologize", "w:plumber", "w:landlord"]'],
  ['["ks? use st", "o-short"]', '["st", "o-short"]'],
  ['["w:routine", "w:habit? no", "w:rarely? no", "w:occasionally", "w:constantly"]', '["w:routine", "w:habit", "w:rarely", "w:occasionally", "w:constantly"]'],
  ['["w:gradually", "w:transform", "w:decade", "w:urban-sprawl? no", "w:nowadays"]', '["w:gradually", "w:transform", "w:decade", "w:nowadays", "w:housing-market"]'],
  ['["w:eventually", "w:probably? no", "w:definitely", "w:expect-v? no"]', '["w:eventually", "w:definitely", "w:expect", "w:predict"]'],
  ['["w:misunderstand? no", "w:clarify? no", "w:actually", "w:confusion? no", "w:apology"]', '["w:actually", "w:apology", "w:confuse", "w:message", "w:respond"]'],
  ['["w:milestone", "w:determination", "w:habit-n? no", "w:proud", "w:progress-n"]', '["w:milestone", "w:determination", "w:habit", "w:proud", "w:progress-n"]'],
];
for (const [a, b] of fixes) {
  if (s.includes(a)) s = s.split(a).join(b);
  else console.error("NOT FOUND:", a.slice(0, 45));
}
fs.writeFileSync(p, s, "utf8");
console.log("bad refs left:", (s.match(/\? no|\? use/g) || []).length);
