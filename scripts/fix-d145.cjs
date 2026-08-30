const fs = require("fs");
const p = "src/content/pipeline/plan-144-150-clean.ts";
let lines = fs.readFileSync(p, "utf8").split("\n");
// Fix d145 (line index 13)
lines[12] = lines[12].replace(
  '"w:recycle", "w:garbage", "w:container? no", "w:feedback"',
  '"w:recycle", "w:environment", "w:noise", "w:feedback", "w:list"'
);
// Fix d148 (line index 31) - remove placeholder vocabIds
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("fire-extinguisher")) {
    lines[i] = lines[i].replace(
      /"w:[^"]*fire[^"]*"\s*,\s*"w:[^"]*exit[^"]*"\s*,\s*"w:[^"]*gather[^"]*"/,
      '"w:first-aid", "w:emergency-room-n", "w:gathering"'
    );
  }
}
fs.writeFileSync(p, lines.join("\n"), "utf8");
console.log("d145 and d148 fixed");
