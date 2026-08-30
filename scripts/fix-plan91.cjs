const fs = require("fs");
const p = "src/content/pipeline/plan-91-120.ts";
let s = fs.readFileSync(p, "utf8");

// remove the accidental broken first entry fragment (day 91 partial)
const badStart = s.indexOf('  {\n    day: 91');
if (badStart === -1) { console.error("day91 block not found"); process.exit(1); }
// rebuild day91 entry cleanly
const good91 = `  {
    day: 91, titleEn: "Softening Opinions", titleZh: "第 91 天 · 委婉表达", goalZh: "用 maybe/could/perhaps 委婉表态。",
    vocabIds: ["w:personally", "w:perhaps", "w:viewpoint", "w:attitude", "w:certain"], grammarTopicId: "basic-clauses",
    phonicsRuleIds: ["er", "ai"], pattern: { titleZh: "句型：It might be ___, maybe?", explainZh: "委婉=留余地：might/maybe/perhaps 让语气更客气，适合职场与陌生人。",
      examples: [["Maybe we could try the other way?", "也许我们可以换个方法？"], ["It might rain later.", "待会儿可能会下雨。"], ["Perhaps ten is too early.", "十点也许太早了。"]],
      sentences: [["I would say it depends.", "我觉得要看情况。"], ["It seems a bit pricey.", "好像有点贵。"], ["Could we revisit this tomorrow?", "明天再谈行吗？"]] },
    reading: [["Emails soften requests with could and perhaps.", "邮件用 could 和 perhaps 让请求更柔和。"], ["Direct words can sound rude in writing.", "直白的词在书面上显得生硬。"], ["Politeness buys patience.", "礼貌换来耐心。"]],
    writing: { zh: "把“这方案不行”改写成委婉句。", hintEn: "Maybe we could ___ instead." } },
`;
// find end of current day91 object: up to '  },\n' after badStart
const endMarker = "  },\n";
const restStart = s.indexOf(endMarker, badStart) + endMarker.length;
s = s.slice(0, badStart) + good91 + s.slice(restStart);

const fixes = [
  ['["w:complain? no", "w:issue", "w:fix", "w:apologize"]', '["w:issue", "w:fix", "w:apologize", "w:plumber", "w:landlord"]'],
  ['["w:routine", "w:habit? no", "w:rarely? no", "w:occasionally", "w:constantly"]', '["w:routine", "w:habit", "w:rarely", "w:occasionally", "w:constantly"]'],
  ['["w:gradually", "w:transform", "w:decade", "w:urban-sprawl? no", "w:nowadays"]', '["w:gradually", "w:transform", "w:decade", "w:nowadays", "w:housing-market"]'],
  ['["w:eventually", "w:probably? no", "w:definitely", "w:expect-v? no"]', '["w:eventually", "w:definitely", "w:expect", "w:predict"]'],
  ['["w:misunderstand? no", "w:clarify? no", "w:actually", "w:confusion? no", "w:apology"]', '["w:actually", "w:apology", "w:confuse", "w:message", "w:respond"]'],
  ['["w:milestone", "w:determination", "w:habit-n? no", "w:proud", "w:progress-n"]', '["w:milestone", "w:determination", "w:habit", "w:proud", "w:progress-n"]'],
];
for (const [a, b] of fixes) {
  if (s.includes(a)) s = s.split(a).join(b);
  else console.error("NOT FOUND:", a.slice(0, 40));
}
fs.writeFileSync(p, s, "utf8");
console.log("bad refs left:", (s.match(/\? no/g) || []).length);
