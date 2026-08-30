const fs = require("fs");
const p = "src/content/pipeline/plan-91-120.ts";
let s = fs.readFileSync(p, "utf8");
const bad = '"w:plumber", "w:landlord"';
if (!s.includes(bad)) { console.error("not found"); process.exit(1); }
s = s.split(bad).join('"w:repair", "w:schedule"');
fs.writeFileSync(p, s, "utf8");
console.log("d92 fixed");
