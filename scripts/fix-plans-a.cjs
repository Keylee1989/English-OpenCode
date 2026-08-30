const fs = require("fs");

// plan-111-130 fixes
{
  const p = "src/content/pipeline/plan-111-130.ts";
  let s = fs.readFileSync(p, "utf8");
  const pairs = [
    ['["w:solve", "w:respond", "w:detect", "w:support? no", "w:escalate"]', '["w:solve", "w:respond", "w:detect", "w:escalate-issue", "w:request-n"]'],
    ['["w:negotiate", "w:extend", "w:milestone", "w:prioritize", "w:realistic"]', '["w:negotiate", "w:extend", "w:milestone", "w:estimate", "w:feedback"]'],
    ['["w:disagree", "w:however", "w:evidence", "w:defend", "w:on-the-other-hand"]', '["w:disagree", "w:however", "w:evidence", "w:defend", "w:on-the-other-hand"]'],
    ['["w:insist", "w:compromise? no", "w:reject", "w:accept-v? no", "w:middle-ground? no"]', '["w:insist", "w:reject", "w:accept", "w:quarrel", "w:resolve"]'],
  ];
  for (const [a, b] of pairs) if (s.includes(a)) s = s.split(a).join(b); else console.error("P130 MISS:", a.slice(0, 30));
  fs.writeFileSync(p, s, "utf8");
}

// plan-118-125 fixes
{
  const p = "src/content/pipeline/plan-118-125.ts";
  let s = fs.readFileSync(p, "utf8");
  const pairs = [
    ['["w:request-n", "w:attachment", "w:respond", "w:feedback", "w:urgent"]', '["w:request-n", "w:attachment", "w:respond", "w:feedback", "w:deadline"]'],
    ['["w:apology", "w:apologize", "w:inconvenience? no", "w:prevent", "w:trust-v? no"]', '["w:apology", "w:apologize", "w:prevent", "w:reassure", "w:refund"]'],
    ['["w:client", "w:confirm", "w:hold-on", "w:call-back", "w:solution? no - use solve"]', '["w:client", "w:confirm", "w:hold-on", "w:call-back", "w:solve"]'],
    ['["w:device", "w:restart", "w:connection? no", "w:error? no", "w:resolve"]', '["w:device", "w:restart", "w:bug", "w:update", "w:resolve"]'],
    ['["w:prioritize", "w:focus-n", "w:urgent", "w:important? no", "w:list-n2? no - use list"]', '["w:prioritize", "w:focus", "w:urgent", "w:goal", "w:list"]'],
    ['["w:reject", "w:instead", "w:boundaries? no", "w:alternative? no", "w:honestly"]', '["w:reject", "w:instead", "w:honestly", "w:polite? no - use politely"], '.replace(', ],', ']')],
    ['["w:stress? no", "w:overwhelm? no", "w:breathe", "w:mental-health", "w:unwind? no"]', '["w:breathe", "w:mental-health", "w:fatigue", "w:relief", "w:routine"]'],
    ['["w:determination", "w:milestone", "w:qualification", "w:expertise", "w:strategy-n"]', '["w:determination", "w:milestone", "w:qualification", "w:expertise", "w:strategy"]'],
  ];
  for (const [a, b] of pairs) {
    if (s.includes(a)) { s = s.split(a).join(b); }
    else console.error("P125 MISS:", a.slice(0, 40));
  }
  // the odd constructed pair above may need direct fix:
  s = s.split('["w:reject", "w:instead", "w:honestly", "w:polite? no - use politely"], ]').join('["w:reject", "w:instead", "w:honestly", "w:politely"]');
  s = s.split('"w:polite? no - use politely"').join('"w:politely"');
  fs.writeFileSync(p, s, "utf8");
}
console.log("plan ref fixes applied");
