const fs = require("fs");
const p = "src/content/vocab/groups/g95-culture-usa1.ts";
let s = fs.readFileSync(p, "utf8");
const renames = [
  ["background-check-job", "background-check"],
  ["bachelor-party-n2", "bachelor-party"],
  ["black-friday-sale", "black-friday"],
  ["carpool-lane-rules", "carpool-lane"],
  ["credit-history-length", "credit-history"],
  ["driver-license-renewal", "driver-license"],
  ["flea-market-find", "flea-market"],
  ["garage-sale-weekend", "garage-sale"],
  ["green-card-process", "green-card"],
  ["health-insurance-plan", "health-plan"],
  ["homeowners-association", "hoa"],
  ["job-reference-letter", "job-reference"],
  ["labor-day-weekend", "labor-day"],
  ["lease-agreement-sign", "lease-agreement"],
  ["national-park-pass", "national-park"],
  ["presidents-day-sale", "presidents-day"],
  ["property-tax-bill", "property-tax"],
  ["super-bowl-party", "super-bowl"],
  ["thanksgiving-dinner-n2", "thanksgiving-dinner"],
  ["tip-jar-counter", "tip-jar"],
  ["voter-registration-form", "voter-registration"],
  ["warranty-registration-card", "warranty-card"],
];
for (const [a, b] of renames) s = s.split(`"${a}"`).join(`"${b}"`);
// fix zh for renamed rows where mismatched
s = s.replace('v("ssn", "社会安全号码(SSN)"', 'v("ssn", "社会安全号(SSN)"');
fs.writeFileSync(p, s, "utf8");
const ids = [...s.matchAll(/\bv\("([^"]+)"/g)].map((m) => m[1]);
console.log(ids.join(" "));
