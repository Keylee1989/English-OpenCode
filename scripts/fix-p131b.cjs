const fs = require("fs");
const p = "src/content/pipeline/plan-131-137.ts";
let s = fs.readFileSync(p, "utf8");
const safe = ["w:feedback", "w:practice", "w:review", "w:progress-n", "w:list", "w:goal"];
let i = 0;
s = s.replace(/"[^"]*\?[^"]*"/g, () => '"' + safe[i++ % safe.length] + '"');
fs.writeFileSync(p, s, "utf8");
console.log("placeholders left:", (s.match(/\?/g) || []).length);
