const fs = require("fs");
const p = "src/content/pipeline/plan-126-130.ts";
let s = fs.readFileSync(p, "utf8");
const fixes = [
  ['"w:request-n"', '"w:request"'],
  ['"w:available? no - use availability? skip", "w:calendar-n? no - use calendar? skip", "w:reschedule? no"', '"w:availability? no - use calendar? skip"'],
  // simpler: replace that whole trio with existing ids
  ['"w:available? no - use availability? skip",\n     "w:calendar-n? no - use calendar? skip",\n     "w:reschedule? no"', '"w:list", "w:agenda", "w:feedback"'],
  ['"w:waste-v? no - use waste"', '"w:waste"'],
  ['"w:focus-n"', '"w:focus"'],
  ['"w:stress? no - use pressure? skip - use fatigue"', '"w:fatigue"'],
  ['"w:prioritize"', '"w:limit"'],
  ['"w:finish-v? no - use complete"', '"w:complete"'],
];
for (const [a, b] of fixes) {
  if (s.includes(a)) { s = s.split(a).join(b); console.log("fixed:", a.slice(0, 30)); }
}
fs.writeFileSync(p, s, "utf8");
console.log("pass done");
