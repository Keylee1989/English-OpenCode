const fs = require("fs");

// d104: estimate exists as w:estimate? g46 has purchase... estimate was in g56? No.
{
  const p = "src/content/pipeline/plan-101-110.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.split('"w:appointment", "w:estimate"]').join('"w:appointment", "w:feedback"]');
  // d105 fix suffixes to real ids
  s = s.split('["w:headline", "w:article-n", "w:source-n", "w:bias", "w:evidence-n"]')
       .join('["w:headline", "w:article", "w:source", "w:bias", "w:evidence"]');
  fs.writeFileSync(p, s, "utf8");
}
console.log("d104/d105 refs fixed");
