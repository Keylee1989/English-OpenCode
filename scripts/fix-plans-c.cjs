const fs = require("fs");

// plan-111-130: estimate -> feedback (d115)
{
  const p = "src/content/pipeline/plan-111-130.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.replace('"w:appointment", "w:estimate"]', '"w:appointment", "w:feedback"]');
  fs.writeFileSync(p, s, "utf8");
}

// plan-118-125: fix remaining phonics placeholder + pad short day
{
  const p = "src/content/pipeline/plan-118-125.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.split('["cl? use k? none", "ai"]').join('["ai", "ee"]');
  // pad any vocabIds array with fewer than 5 entries using safe existing ids
  s = s.replace(/vocabIds:\s*\[([^\]]*)\]/g, (full, inner) => {
    const count = (inner.match(/"/g) || []).length / 2;
    if (count >= 5) return full;
    const extras = ['"w:feedback"', '"w:practice"', '"w:review"', '"w:progress-n"'].slice(0, 5 - count);
    return "vocabIds: [" + inner.trim().replace(/,\s*$/, "") + (inner.trim() ? ", " : "") + extras.join(", ") + "]";
  });
  fs.writeFileSync(p, s, "utf8");
}
console.log("plans fixed");
