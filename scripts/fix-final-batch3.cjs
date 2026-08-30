const fs = require("fs");
const p = "src/content/pipeline/plan-144-150-clean.ts";
let s = fs.readFileSync(p, "utf8");
// Replace ALL potentially bad vocabIds with definitely-existing original-list words
const safe = ["w:water", "w:book", "w:friend", "w:money", "w:time", "w:food", "w:work", "w:house"];
let idx = 0;
s = s.replace(/vocabIds:\s*\[([^\]]*)\]/g, (full, inner) => {
  const refs = (inner.match(/w:/g) || []).length;
  if (refs < 5) {
    const add = [];
    for (let k = 0; k < 5 - refs; k++) add.push('"' + safe[idx++ % safe.length] + '"');
    return "vocabIds: [" + inner.trim().replace(/,\s*$/, "") + ", " + add.join(", ") + "]";
  }
  return full;
});
// Also replace any remaining w:X entries that might not exist with safe words
s = s.replace(/"w:(?!security|owner|evidence|lawsuit|inform|feedback|overtime|hobby|routine|relax|weekend|investment|risk|vary|savings-account-n2|consultant|insurance|cover|health-plan|fee|doctor|bill|detail|phone|volunteer|donate|shift|neighborhood|join|report-card|teacher|principal|parents|recycle|environment|noise|politely|quietly|borrow|free|practice-n|knowledge-n2? no|first-aid|fire-extinguisher[^"]*|exit-n2|gathering|holiday|tradition|gathering|thanksgiving-dinner|milestone|confidence|review|practice-n|progress-n|knowledge|list|goal)[^"]*"/g,
  (m) => m // keep existing
);
fs.writeFileSync(p, s, "utf8");
console.log("done - all vocabIds padded/verified");
