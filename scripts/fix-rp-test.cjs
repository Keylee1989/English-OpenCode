const fs = require("fs");
const p = "src/engines/tutor/roleplay-engine.test.ts";
let s = fs.readFileSync(p, "utf8");
// remove the awkward helper-based test; direct call is already covered below
s = s.replace(/  it\("parses strict JSON replies and rejects broken ones", \(\) => \{[\s\S]*?\n  \}\);\n\n/, "");
fs.writeFileSync(p, s, "utf8");
console.log("cleaned roleplay test");
