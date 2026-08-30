const fs = require("fs");
const path = require("path");
const dir = "src/content/pipeline";
for (const f of fs.readdirSync(dir)) {
  if (!f.startsWith("plan-")) continue;
  const s = fs.readFileSync(path.join(dir, f), "utf8");
  const entries = s.split(/\{ day:/).slice(1);
  entries.forEach((e, i) => {
    const day = e.match(/^(\d+)/);
    // check pattern examples/sentences arrays have 3 pairs
    const ex = e.match(/examples:\s*\[([\s\S]*?)\]\]/);
    if (ex) {
      const pairs = (ex[1].match(/\["/g) || []).length;
      if (pairs < 3) console.log(`${f} entry${i + 1} (day ${day && day[1]}) examples pairs=${pairs}`);
    }
    const sen = e.match(/sentences:\s*\[([\s\S]*?)\]\]/);
    if (sen) {
      const pairs = (sen[1].match(/\["/g) || []).length;
      if (pairs < 3) console.log(`${f} entry${i + 1} (day ${day && day[1]}) sentences pairs=${pairs}`);
    }
  });
}
console.log("pair scan done");
