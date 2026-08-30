const fs = require("fs");
const p = "src/content/pipeline/plan-131-137.ts";
let s = fs.readFileSync(p, "utf8");

const fixes = [
  // d134
  ['pattern: { titleZh: "w:feedback", explainZh: "看房必问', 'pattern: { titleZh: "句型：Is ___ included in the rent? / How\'s the ___ around here?", explainZh: "看房必问'],
  ['writing: { zh: "写一句看房时要问的问题。", hintEn: "w:list" } }', 'writing: { zh: "写一句看房时要问的问题。", hintEn: "Is ___ included? How\'s ___?" } }'],
  // d135
  ['pattern: { titleZh: "w:goal", explainZh: "关键条款', 'pattern: { titleZh: "句型：What\'s the notice period? / Does it allow ___?", explainZh: "关键条款'],
  ['writing: { zh: "写一句签约前要确认的条款。", hintEn: "w:progress-n" } }', 'writing: { zh: "写一句签约前要确认的条款。", hintEn: "Before signing, does the lease allow ___?" } }'],
  // d136
  ['pattern: { titleZh: "w:list", explainZh: "维修请求', 'pattern: { titleZh: "句型：This needs fixing soon. When can someone come?", explainZh: "维修请求'],
  ['writing: { zh: "写一条报修短信。", hintEn: "w:goal" } }', 'writing: { zh: "写一条报修短信。", hintEn: "Hi, the ___ isn\'t working. When can someone come?" } }'],
  // d137
  ['pattern: { titleZh: "w:feedback", explainZh: "二手车三问', 'pattern: { titleZh: "句型：Has it been in any accidents? / Can I take it to my mechanic?", explainZh: "二手车三问'],
  ['writing: { zh: "写一句买二手车时的关键问题。", hintEn: "w:list" } }', 'writing: { zh: "写一句买二手车时的关键问题。", hintEn: "Before buying, can you show me ___?" } }'],
];
for (const [a, b] of fixes) {
  if (s.includes(a)) s = s.split(a).join(b);
  else console.error("MISS:", a.slice(0, 40));
}
fs.writeFileSync(p, s, "utf8");
console.log("p131 restored titles/hints");
