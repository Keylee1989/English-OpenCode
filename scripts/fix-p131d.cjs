const fs = require("fs");
const p = "src/content/pipeline/plan-131-137.ts";
let s = fs.readFileSync(p, "utf8");

// d131 titleZh
s = s.replace(
  'pattern: { titleZh: "w:feedback", explainZh: "开户问三件',
  'pattern: { titleZh: "句型：I\'d like to open ___. / Is there a monthly fee?", explainZh: "开户问三件'
);
// d134
s = s.replace(
  'pattern: { titleZh: "w:practice", explainZh: "看房必问',
  'pattern: { titleZh: "句型：Is ___ included in the rent? / How\'s the ___ around here?", explainZh: "看房必问'
);
s = s.replace(
  'hintEn: "w:review" } },\n    reading: [["Two plans, one question',
  'hintEn: "Is ___ included? How\'s ___?" } },\n    reading: [["Two plans, one question'
);
// d135
s = s.replace(
  'pattern: { titleZh: "w:progress-n", explainZh: "关键条款',
  'pattern: { titleZh: "句型：What\'s the notice period? / Does it allow ___?", explainZh: "关键条款'
);
s = s.replace(
  'hintEn: "w:list" } },\n    reading: [["Ben asked for clauses',
  'hintEn: "Before signing, does the lease allow ___?" } },\n    reading: [["Ben asked for clauses'
);
// d136
s = s.replace(
  'pattern: { titleZh: "w:goal", explainZh: "维修请求',
  'pattern: { titleZh: "句型：This needs fixing soon. When can someone come?", explainZh: "维修请求'
);
s = s.replace(
  'hintEn: "w:feedback" } },\n    reading: [["A slow drip became',
  'hintEn: "Hi, the ___ isn\'t working. When can someone come?" } },\n    reading: [["A slow drip became'
);
// d137
s = s.replace(
  'pattern: { titleZh: "w:practice", explainZh: "二手车三问',
  'pattern: { titleZh: "句型：Has it been in any accidents? / Can I take it to my mechanic?", explainZh: "二手车三问'
);
s = s.replace(
  'hintEn: "w:review" } },\n    writing: { zh: "写一句买二手车时的关键问题。',
  'hintEn: "Before buying, can you show me ___?" } },\n    writing: { zh: "写一句买二手车时的关键问题。'
);

fs.writeFileSync(p, s, "utf8");
console.log("remaining corrupted fields:", (s.match(/titleZh:\s*"w:|hintEn:\s*"w:/g) || []).length);
