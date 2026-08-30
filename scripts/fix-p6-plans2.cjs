const fs = require("fs");

// plan-144-150 remaining fixes
{
  const p = "src/content/pipeline/plan-144-150.ts";
  let s = fs.readFileSync(p, "utf8");
  // Replace remaining placeholder vocabIds with existing words
  s = s.split('"w:complaint"').join('"w:complain"');
  s = s.split('"w:exit-n2"').join('"w:exit"');
  s = s.split('"w:family"').join('"w:feedback"');
  // Fix remaining placeholders
  s = s.replace(/"\?[^"]*"/g, '"w:list"');
  fs.writeFileSync(p, s, "utf8");
}

// plan-151-158 fixes - replace all bad ids with existing ones
{
  const p = "src/content/pipeline/plan-151-158.ts";
  let s = fs.readFileSync(p, "utf8");
  const pairs = [
    ['"w:source-n"', '"w:source"'],
    ['"w:policy-n"', '"w:policy"'],
    ['"w:solution? no - use solve"', '"w:solve"'],
    ['"w:request-n"', '"w:request"'],
    ['"w:decision-n2? no - use decision"', '"w:decision"'],
    ['"w:option-n"', '"w:option"'],
    ['"w:confirm-v? skip - use confirm"', '"w:confirm"'],
    ['"w:offer-n? no - use offer"', '"w:offer"'],
    ['"w:summarize? no - use recap"', '"w:recap"'],
    ['"w:plain-adj"', '"w:plain"'],
    ['"w:hint-n"', '"w:hint"'],
    // fix phonics
    ['["fr? use fl", "ee"]', '["fl", "ee"]'],
  ];
  for (const [a, b] of pairs) {
    if (s.includes(a)) s = s.split(a).join(b);
  }
  // blanket placeholder cleanup
  s = s.replace(/"\?[^"]*"/g, '"w:list"');
  fs.writeFileSync(p, s, "utf8");
}
console.log("done");
