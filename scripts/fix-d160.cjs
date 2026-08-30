const fs = require("fs");
const p = "src/content/pipeline/plan-159-162.ts";
let lines = fs.readFileSync(p, "utf8").split("\n");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('"w:progress-n"],')) {
    lines[i] = lines[i].replace('"w:progress-n"],', '"w:progress-n", "w:goal"],');
    console.log("padded d160");
    break;
  }
}
fs.writeFileSync(p, lines.join("\n"), "utf8");

// also fix d143 to have 6
{
  const p2 = "src/content/pipeline/plan-138-143.ts";
  let s2 = fs.readFileSync(p2, "utf8");
  if (s2.includes('"w:join"]')) {
    s2 = s2.replace('"w:join"]', '"w:join", "w:feedback"]');
    fs.writeFileSync(p2, s2, "utf8");
    console.log("d143 padded");
  }
}
