const fs = require("fs");
const s = fs.readFileSync("src/content/grammar/c2/grammar-c2.ts", "utf8");
const m = [...s.matchAll(/id:\s*"([^"]+)"/g)].map(x => x[1]);
console.log(m.join("\n"));
