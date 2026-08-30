const fs = require("fs");
const p = "src/content/vocab/groups/g95-culture-usa1.ts";
let s = fs.readFileSync(p, "utf8");

// drop rows colliding with existing ids
s = s.replace(/  v\("affordable-care"[^\n]*\n/, "");
s = s.replace(/  v\("welfare-state-n2"[^\n]*\n/, "");

const renames = [
  ["aging-population", "aging"],
  ["civic-duty", "civic"],
  ["class-divide", "social-class"],
  ["community-center-n2", "community-center"],
  ["homelessness-issue", "homelessness"],
  ["human-rights-law", "human-rights"],
  ["infrastructure-bill", "infrastructure"],
  ["labor-union-n2", "labor"],
  ["nonprofit-org", "nonprofit"],
  ["public-transport-n2", "public-transport"],
  ["quality-of-life-n2", "quality-of-life"],
  ["social-media-use", "social-media"],
  ["social-security-number", "ssn"],
];
for (const [a, b] of renames) s = s.split(`"${a}"`).join(`"${b}"`);
s = s.split('v ("').join('v("');
fs.writeFileSync(p, s, "utf8");

const ids = [...s.matchAll(/\bv\("([^"]+)"/g)].map((m) => m[1]);
console.log(ids.join(" "));
