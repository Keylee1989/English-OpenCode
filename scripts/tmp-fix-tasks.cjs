const fs = require("fs");
const f = "src/content/resources/video-library.ts";
let s = fs.readFileSync(f, "utf8");

// Find patterns like: ["xxx", "yyy"] ] or ["xxx", "yyy"] } at end of tasksZh
// These indicate only 2 items. We need 3.
// Strategy: find all lines containing "tasksZh" and check if they have exactly 2 array items

const lines = s.split("\n");
let fixed = 0;
const out = lines.map((line) => {
  if (!line.includes("tasksZh")) return line;
  
  // Count items in the tasksZh array
  const match = line.match(/tasksZh:\s*\[([^\]]+)\]/);
  if (!match) return line;
  
  const inner = match[1];
  // Count comma-separated top-level strings
  const itemCount = (inner.match(/"/g) || []).length / 2;
  
  if (itemCount >= 3) return line;
  
  // Need to add a third item
  const insertPos = line.indexOf("]", line.indexOf("tasksZh"));
  if (insertPos === -1) return line;
  
  fixed++;
  return line.slice(0, insertPos) + ', "写50词学习心得并自评"' + line.slice(insertPos);
});

fs.writeFileSync(f, out.join("\n"), "utf8");
console.log("Fixed:", fixed, "lines");
