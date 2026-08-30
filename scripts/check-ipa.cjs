const fs = require("fs");
const files = [
  "src/content/vocab/groups/g89-verbs-advanced.ts",
  "src/content/vocab/groups/g90-verbs-advanced2.ts",
  "src/content/vocab/groups/g91-adjectives-advanced.ts",
  "src/content/vocab/groups/g92-nouns-society3.ts",
  "src/content/vocab/groups/g93-idioms-chunks1.ts",
  "src/content/vocab/groups/g94-finance-household.ts",
  "src/content/vocab/groups/g95-culture-usa1.ts",
  "src/content/vocab/groups/g97-business-email.ts",
  "src/content/vocab/groups/g98-meetings-negotiation.ts",
  "src/content/vocab/groups/g99-career-skills2.ts",
];
let bad = 0;
for (const p of files) {
  const s = fs.readFileSync(p, "utf8");
  for (const m of s.matchAll(/\bv\("([^"]+)",\s*"[^"]*",\s*"([^"]*)"/g)) {
    if (!m[2].startsWith("/")) {
      console.log(p.split("/").pop(), m[1], "=>", m[2]);
      bad++;
    }
  }
}
console.log(bad === 0 ? "ALL IPA OK" : `${bad} bad ipa rows`);
