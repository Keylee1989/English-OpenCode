const fs = require("fs");

// plan-144-150 fixes
{
  const p = "src/content/pipeline/plan-144-150.ts";
  let s = fs.readFileSync(p, "utf8");
  const fixes = [
    // d144
    ['"w:report-card", "w:teacher", "w:principal", "w:parent-teacher? no - use parents"',
     '"w:report-card", "w:teacher", "w:principal", "w:parents", "w:feedback"]'],
    // d145
    ['["ai? use ay", "cl"]', '["ay? no - use ai", "cl"]'],
    ['"w:guideline? no - use rule"', '"w:rule"'],
    // d146
    ['"w:polite-v? no - use politely"', '"w:politely"'],
    ['"w:complaint-n? no - use complaint"', '"w:complaint"'],
    ['["oi", "n? use ng"]', '["oi", "ng"]'],
    // d147
    ['"w:library-card-signup? no - use library-card? skip - use library"', '"w:library"'],
    ['"w:course-n2? no - use course"', '"w:course"'],
    ['["br? no - use bl", "ee"]', '["bl", "ee"]'],
    // d148
    ['"w:first-aid", "w:fire-extinguisher? no - use extinguisher? skip - use fire", "w:evacuation? no - use evacuate? skip - use escape-route? skip - use exit", "w:gather? no - use gather-v? skip - use meet-up? skip - use gathering"',
     '"w:first-aid", "w:fire", "w:escape", "w:exit-n2", "w:gathering"'],
    ['grammarTopicId: "imperative? none - use negation"', 'grammarTopicId: "negation"'],
    ['["ai", "st"]', '["ai", "st"]'],  // keep as is
    // d149
    ['"w:holiday", "w:tradition", "w:gather-v? no - use gathering", "w:turkey? no - use thanksgiving-dinner"',
     '"w:holiday", "w:tradition", "w:gathering", "w:thanksgiving-dinner", "w:family"'],
  ];
  for (const [a, b] of fixes) {
    if (s.includes(a)) s = s.split(a).join(b);
    else console.log("P144 MISS:", a.slice(0, 50));
  }
  fs.writeFileSync(p, s, "utf8");
}

// plan-151-158 fixes
{
  const p = "src/content/pipeline/plan-151-158.ts";
  let s = fs.readFileSync(p, "utf8");
  const fixes = [
    // d155
    ['"w:simple-adj? no - use plain-adj", "w:analogy? no - use example", "w:step-by-step? skip - use step", "w:compare-v? no - use compare-v? exists g55 as compare"',
     '"w:plain-adj", "w:example", "w:step", "w:compare"'],
    // d156
    // already fine
    // d157
    ['"w:relief-n2? no - use relief"', '"w:relief"'],
    ['"w:homesick? no - use homesickness"', '"w:homesickness"'],
    ['"w:unease? no - use dread"', '"w:dread"'],
    ['["fr? use fl", "ee"]', '["fl", "ee"]'],
    // d158
    ['"w:direct? no - use directness? skip - use clearly"', '"w:clearly"'],
    ['"w:misunderstand? no - use confuse"', '"w:confuse"'],
  ];
  for (const [a, b] of fixes) {
    if (s.includes(a)) s = s.split(a).join(b);
    else console.log("P151 MISS:", a.slice(0, 50));
  }
  fs.writeFileSync(p, s, "utf8");
}
console.log("done");
