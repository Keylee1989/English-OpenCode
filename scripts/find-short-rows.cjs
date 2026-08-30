const fs = require("fs");
const files = [
  "g89-verbs-advanced", "g90-verbs-advanced2", "g91-adjectives-advanced",
  "g92-nouns-society3", "g93-idioms-chunks1", "g94-finance-household",
  "g95-culture-usa1", "g97-business-email", "g98-meetings-negotiation", "g99-career-skills2",
];
for (const name of files) {
  const p = `src/content/vocab/groups/${name}.ts`;
  const lines = fs.readFileSync(p, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (!line.trim().startsWith("v(")) return;
    // count top-level commas inside the call
    let depth = 0, commas = 0;
    for (const ch of line) {
      if (ch === "(") depth++;
      else if (ch === ")") { depth--; if (depth === 0) break; }
      else if (ch === "," && depth === 1) commas++;
    }
    if (commas < 8) console.log(`${name}:${i + 1} args=${commas + 1}`);
  });
}
console.log("scan done");
