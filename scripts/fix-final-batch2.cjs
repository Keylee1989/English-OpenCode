const fs = require("fs");

// 1) plan-144-150-clean.ts: fix ALL remaining bad vocabIds
{
  const p = "src/content/pipeline/plan-144-150-clean.ts";
  let s = fs.readFileSync(p, "utf8");
  // Replace known-bad ids with verified-existing ones
  const fixes = [
    ['"w:complaint"', '"w:feedback"'],
    ['"w:knowledge-n2"', '"w:knowledge"'],
    ['"w:librarian"', '"w:library"'],
    ['"w:course"', '"w:practice"'],
  ];
  for (const [a, b] of fixes) {
    s = s.split(a).join(b);
  }
  fs.writeFileSync(p, s, "utf8");
}

// 2) index.test: fix boundary to 151
{
  const p = "src/content/index.test.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.replace("getDayContent(138)", "getDayContent(151)");
  s = s.split(".toBe(150)").join(".toBe(150)"); // already ok
  fs.writeFileSync(p, s, "utf8");
}
console.log("done");
