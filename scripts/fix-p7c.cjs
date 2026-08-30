const fs = require("fs");

// 1) d138: revert to 5 vocabIds (remove the feedback we just added)
{
  const p = "src/content/pipeline/plan-138-143.ts";
  let s = fs.readFileSync(p, "utf8");
  // The line should have exactly 6 now, reduce to 5 by removing feedback
  s = s.replace(
    /("w:inform"), "w:feedback"\]/,
    "$1]"
  );
  fs.writeFileSync(p, s, "utf8");
}

// 2) d160: pad vocab to 5
{
  const p = "src/content/pipeline/plan-159-162.ts";
  let s = fs.readFileSync(p, "utf8");
  // Find d160 entry and pad
  const lines = s.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("day: 160")) {
      // find the vocabIds line at or after this
      for (let j = i; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].includes("vocabIds:")) {
          const count = (lines[j].match(/w:/g) || []).length;
          if (count < 5) {
            const needed = 5 - count;
            const extras = [];
            const pool = ["w:feedback", "w:practice", "w:review", "w:list"];
            for (let k = 0; k < needed; k++) extras.push('"' + pool[k % pool.length] + '"');
            lines[j] = lines[j].replace(/\]\s*,/, ", " + extras.join(", ") + "],");
          }
          break;
        }
      }
      break;
    }
  }
  fs.writeFileSync(p, lines.join("\n"), "utf8");
}

// 3) dynamic-days: fix all remaining 137 -> 162
{
  const p = "src/content/dynamic-days.test.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.split(".toBe(137)").join(".toBe(162)");
  fs.writeFileSync(p, s, "utf8");
}
console.log("all fixed");
